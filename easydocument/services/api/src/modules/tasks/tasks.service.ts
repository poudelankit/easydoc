import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PoolClient, QueryResultRow } from "pg";
import { AuthenticatedUser, RequestContext } from "../../common/types/authenticated-user";
import { AuditService } from "../audit/audit.service";
import { CommunicationService } from "../communication/communication.service";
import { DatabaseService } from "../database/database.service";
import { StorageService } from "../storage/storage.service";
import { UsersService } from "../users/users.service";
import { CreateTaskDto, SupportingDocumentPlaceholderDto } from "./dto/create-task.dto";

const NEARBY_RADIUS_METERS = 25_000;

type TaskStatus = "CREATED" | "ACCEPTED";

interface TaskRow extends QueryResultRow {
  id: string;
  customer_user_id: string;
  assigned_agent_user_id: string | null;
  task_name: string;
  document_type: string;
  organization_name: string;
  organization_address: string;
  organization_latitude: string | number;
  organization_longitude: string | number;
  request_description: string;
  status: TaskStatus;
  accepted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  customer_full_name: string;
  customer_phone_number: string;
  customer_address_text: string | null;
  assigned_agent_full_name: string | null;
  assigned_agent_phone_number: string | null;
  assigned_agent_profile_id: string | null;
  assigned_agent_status: string | null;
  assigned_agent_permanent_latitude: string | number | null;
  assigned_agent_permanent_longitude: string | number | null;
  supporting_documents: unknown;
  distance_meters: string | number | null;
}

interface InsertedTaskRow extends QueryResultRow {
  id: string;
  task_name: string;
  status: TaskStatus;
}

interface FileMetadataRow extends QueryResultRow {
  id: string;
  object_key: string;
  original_filename: string | null;
  mime_type: string;
  size_bytes: string | number;
  status: string;
}

interface AgentLocationRow extends QueryResultRow {
  id: string;
  status: string;
  is_available: boolean;
  permanent_latitude: string | number;
  permanent_longitude: string | number;
}

interface AcceptCandidateRow extends QueryResultRow {
  id: string;
  status: TaskStatus;
  assigned_agent_user_id: string | null;
  distance_meters: string | number;
}

interface AgentLocation {
  profileId: string;
  status: string;
  isAvailable: boolean;
  permanentLatitude: number;
  permanentLongitude: number;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly database: DatabaseService,
    private readonly users: UsersService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly communication: CommunicationService
  ) {}

  async createTask(user: AuthenticatedUser, dto: CreateTaskDto, context: RequestContext) {
    const customer = await this.users.getProfile(user.id);
    const customerName = customer.fullName.trim();
    if (!customerName) {
      throw new BadRequestException("Customer profile full name is required before creating a task");
    }

    const taskName = this.buildTaskName(customerName, dto.documentType, dto.organizationName);
    const insertedTask = await this.database.transaction(async (client) => {
      const result = await client.query<InsertedTaskRow>(
        `INSERT INTO document_tasks (
           customer_user_id,
           task_name,
           document_type,
           organization_name,
           organization_address,
           organization_location,
           request_description,
           status
         )
         VALUES (
           $1, $2, $3, $4, $5,
           ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography,
           $8,
           'CREATED'
         )
         RETURNING id, task_name, status::text AS status`,
        [
          user.id,
          taskName,
          dto.documentType.trim(),
          dto.organizationName.trim(),
          dto.organizationAddress.trim(),
          dto.organizationLatitude,
          dto.organizationLongitude,
          dto.requestDescription.trim()
        ]
      );

      const task = result.rows[0];
      if (!task) {
        throw new BadRequestException("Task could not be created");
      }

      for (const document of dto.supportingDocuments ?? []) {
        await this.createSupportingDocumentPlaceholder(client, user.id, task.id, document);
      }

      return task;
    });

    await this.audit.write({
      actorUserId: user.id,
      action: "TASK_CREATED",
      entityType: "document_tasks",
      entityId: insertedTask.id,
      afterData: {
        taskName: insertedTask.task_name,
        status: insertedTask.status,
        organizationName: dto.organizationName,
        organizationLatitude: dto.organizationLatitude,
        organizationLongitude: dto.organizationLongitude
      },
      context
    });

    return this.getTaskById(user, insertedTask.id);
  }

  async getMyTasks(user: AuthenticatedUser) {
    if (user.role !== "CUSTOMER" && user.role !== "AGENT") {
      throw new ForbiddenException("Only customers and agents can list their tasks");
    }

    const result = await this.database.query<TaskRow>(
      `${this.taskSelect()}
       ${this.taskJoins()}
       WHERE (
         ($1::text = 'CUSTOMER' AND t.customer_user_id = $2)
         OR
         ($1::text = 'AGENT' AND t.assigned_agent_user_id = $2)
       )
       ${this.taskGroupBy()}
       ORDER BY t.created_at DESC`,
      [user.role, user.id]
    );

    return result.rows.map((row) => this.mapTask(row, { includeCustomerContact: true }));
  }

  async getTaskById(user: AuthenticatedUser, taskId: string) {
    let visibilityClause: string;
    if (user.role === "CUSTOMER") {
      visibilityClause = "t.id = $1 AND t.customer_user_id = $2";
    } else if (user.role === "AGENT") {
      visibilityClause = "t.id = $1 AND t.assigned_agent_user_id = $2";
    } else {
      throw new ForbiddenException("Only customers and assigned agents can view task details");
    }

    const result = await this.database.query<TaskRow>(
      `${this.taskSelect()}
       ${this.taskJoins()}
       WHERE ${visibilityClause}
       ${this.taskGroupBy()}
       LIMIT 1`,
      [taskId, user.id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Task not found");
    }

    return this.mapTask(row, { includeCustomerContact: true });
  }

  async getNearbyRequests(user: AuthenticatedUser) {
    const agent = await this.getAgentPermanentLocation(user.id);
    this.assertAgentAvailability(agent);

    const result = await this.database.query<TaskRow>(
      `${this.taskSelect(
        "ST_Distance(t.organization_location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) AS distance_meters"
      )}
       ${this.taskJoins()}
       WHERE t.status = 'CREATED'
         AND ST_DWithin(
           t.organization_location,
           ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
           $3
         )
       ${this.taskGroupBy()}
       ORDER BY distance_meters ASC, t.created_at DESC
       LIMIT 50`,
      [agent.permanentLatitude, agent.permanentLongitude, NEARBY_RADIUS_METERS]
    );

    return result.rows.map((row) =>
      this.mapTask(row, {
        includeCustomerContact: false,
        includeDistance: true
      })
    );
  }

  async acceptTask(user: AuthenticatedUser, taskId: string, context: RequestContext) {
    const agent = await this.getAgentPermanentLocation(user.id);
    this.assertAgentAvailability(agent);

    const acceptedTaskId = await this.database.transaction(async (client) => {
      const candidateResult = await client.query<AcceptCandidateRow>(
        `SELECT
           id,
           status::text AS status,
           assigned_agent_user_id,
           ST_Distance(
             organization_location,
             ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography
           ) AS distance_meters
         FROM document_tasks
         WHERE id = $1
         FOR UPDATE`,
        [taskId, agent.permanentLatitude, agent.permanentLongitude]
      );

      const candidate = candidateResult.rows[0];
      if (!candidate) {
        throw new NotFoundException("Task not found");
      }

      if (candidate.status !== "CREATED" || candidate.assigned_agent_user_id) {
        throw new ConflictException("Task has already been accepted");
      }

      if (Number(candidate.distance_meters) > NEARBY_RADIUS_METERS) {
        throw new ForbiddenException("Task is outside the nearby service radius");
      }

      await client.query(
        `UPDATE document_tasks
         SET
           status = 'ACCEPTED',
           assigned_agent_user_id = $2,
           accepted_at = NOW(),
           updated_at = NOW()
         WHERE id = $1`,
        [taskId, user.id]
      );

      await this.communication.ensureRoomForAcceptedTask(candidate.id, client);

      return candidate.id;
    });

    await this.audit.write({
      actorUserId: user.id,
      action: "TASK_ACCEPTED",
      entityType: "document_tasks",
      entityId: acceptedTaskId,
      afterData: {
        status: "ACCEPTED",
        assignedAgentUserId: user.id,
        nearbyRadiusMeters: NEARBY_RADIUS_METERS
      },
      context
    });

    return this.getTaskById(user, acceptedTaskId);
  }

  private async createSupportingDocumentPlaceholder(
    client: Pick<PoolClient, "query">,
    userId: string,
    taskId: string,
    dto: SupportingDocumentPlaceholderDto
  ) {
    const extension = this.extensionForMime(dto.mimeType);
    const objectKey = this.storage.buildTaskSupportingPlaceholderKey(userId, taskId, extension);
    const result = await client.query<FileMetadataRow>(
      `INSERT INTO file_metadata (
         uploaded_by_user_id,
         context,
         object_key,
         original_filename,
         mime_type,
         size_bytes,
         status
       )
       VALUES ($1, 'TASK_SUPPORTING', $2, $3, $4, $5, 'PLACEHOLDER')
       RETURNING id, object_key, original_filename, mime_type, size_bytes, status`,
      [
        userId,
        objectKey,
        dto.originalFilename ?? dto.label ?? "supporting-document",
        dto.mimeType,
        dto.sizeBytes
      ]
    );

    const file = result.rows[0];
    if (!file) {
      throw new BadRequestException("Supporting document placeholder could not be created");
    }

    await client.query(
      `INSERT INTO task_supporting_files (task_id, file_metadata_id)
       VALUES ($1, $2)
       ON CONFLICT (task_id, file_metadata_id) DO NOTHING`,
      [taskId, file.id]
    );
  }

  private async getAgentPermanentLocation(userId: string): Promise<AgentLocation> {
    const result = await this.database.query<AgentLocationRow>(
      `SELECT
         id,
         status::text AS status,
         is_available,
         ST_Y(permanent_location::geometry) AS permanent_latitude,
         ST_X(permanent_location::geometry) AS permanent_longitude
       FROM agent_profiles
       WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Agent profile not found");
    }

    return {
      profileId: row.id,
      status: row.status,
      isAvailable: row.is_available,
      permanentLatitude: Number(row.permanent_latitude),
      permanentLongitude: Number(row.permanent_longitude)
    };
  }

  private assertAgentAvailability(agent: AgentLocation) {
    if (!agent.isAvailable) {
      throw new ForbiddenException("Agent is not available for nearby task requests");
    }
  }

  private buildTaskName(customerName: string, documentType: string, organizationName: string) {
    return [
      this.taskNameSegment(customerName),
      this.taskNameSegment(documentType),
      this.taskNameSegment(organizationName)
    ].join("-");
  }

  private taskNameSegment(value: string) {
    return value.trim().replace(/\s+/g, " ").toUpperCase();
  }

  private extensionForMime(mimeType: string) {
    const allowed: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "application/pdf": "pdf"
    };

    const extension = allowed[mimeType];
    if (!extension) {
      throw new BadRequestException("Supporting document placeholders only support JPEG, PNG, or PDF");
    }
    return extension;
  }

  private taskSelect(distanceSql = "NULL::double precision AS distance_meters") {
    return `SELECT
        t.id,
        t.customer_user_id,
        t.assigned_agent_user_id,
        t.task_name,
        t.document_type,
        t.organization_name,
        t.organization_address,
        ST_Y(t.organization_location::geometry) AS organization_latitude,
        ST_X(t.organization_location::geometry) AS organization_longitude,
        t.request_description,
        t.status::text AS status,
        t.accepted_at,
        t.created_at,
        t.updated_at,
        customer_user.full_name AS customer_full_name,
        customer_user.phone_number AS customer_phone_number,
        customer_user.address_text AS customer_address_text,
        assigned_agent_user.full_name AS assigned_agent_full_name,
        assigned_agent_user.phone_number AS assigned_agent_phone_number,
        assigned_agent_profile.id AS assigned_agent_profile_id,
        assigned_agent_profile.status::text AS assigned_agent_status,
        ST_Y(assigned_agent_profile.permanent_location::geometry) AS assigned_agent_permanent_latitude,
        ST_X(assigned_agent_profile.permanent_location::geometry) AS assigned_agent_permanent_longitude,
        ${distanceSql},
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'fileId', file_metadata.id,
              'objectKey', file_metadata.object_key,
              'originalFilename', file_metadata.original_filename,
              'mimeType', file_metadata.mime_type,
              'sizeBytes', file_metadata.size_bytes,
              'status', file_metadata.status
            )
            ORDER BY file_metadata.created_at ASC
          ) FILTER (WHERE file_metadata.id IS NOT NULL),
          '[]'::jsonb
        ) AS supporting_documents`;
  }

  private taskJoins() {
    return `FROM document_tasks t
      JOIN users customer_user ON customer_user.id = t.customer_user_id
      LEFT JOIN users assigned_agent_user ON assigned_agent_user.id = t.assigned_agent_user_id
      LEFT JOIN agent_profiles assigned_agent_profile ON assigned_agent_profile.user_id = t.assigned_agent_user_id
      LEFT JOIN task_supporting_files task_files ON task_files.task_id = t.id
      LEFT JOIN file_metadata ON file_metadata.id = task_files.file_metadata_id`;
  }

  private taskGroupBy() {
    return `GROUP BY
      t.id,
      customer_user.id,
      assigned_agent_user.id,
      assigned_agent_profile.id`;
  }

  private mapTask(
    row: TaskRow,
    options: { includeCustomerContact: boolean; includeDistance?: boolean }
  ) {
    const customer: Record<string, unknown> = {
      userId: row.customer_user_id,
      fullName: row.customer_full_name
    };

    if (options.includeCustomerContact) {
      customer.phoneNumber = row.customer_phone_number;
      customer.addressText = row.customer_address_text;
    }

    return {
      id: row.id,
      taskName: row.task_name,
      documentType: row.document_type,
      organizationName: row.organization_name,
      organizationAddress: row.organization_address,
      organizationLocation: {
        latitude: Number(row.organization_latitude),
        longitude: Number(row.organization_longitude)
      },
      requestDescription: row.request_description,
      status: row.status,
      customer,
      assignedAgent: row.assigned_agent_user_id
        ? {
            userId: row.assigned_agent_user_id,
            profileId: row.assigned_agent_profile_id,
            fullName: row.assigned_agent_full_name,
            phoneNumber: row.assigned_agent_phone_number,
            status: row.assigned_agent_status,
            permanentLocation:
              row.assigned_agent_permanent_latitude !== null &&
              row.assigned_agent_permanent_longitude !== null
                ? {
                    latitude: Number(row.assigned_agent_permanent_latitude),
                    longitude: Number(row.assigned_agent_permanent_longitude)
                  }
                : null
          }
        : null,
      supportingDocuments: this.parseSupportingDocuments(row.supporting_documents),
      distanceMeters:
        options.includeDistance && row.distance_meters !== null
          ? Math.round(Number(row.distance_meters))
          : null,
      acceptedAt: this.dateOrNull(row.accepted_at),
      createdAt: this.dateOrNull(row.created_at),
      updatedAt: this.dateOrNull(row.updated_at)
    };
  }

  private parseSupportingDocuments(value: unknown) {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((document) => {
      const item = document as Record<string, unknown>;
      return {
        fileId: String(item.fileId),
        objectKey: String(item.objectKey),
        originalFilename: item.originalFilename === null ? null : String(item.originalFilename),
        mimeType: String(item.mimeType),
        sizeBytes: Number(item.sizeBytes),
        status: String(item.status)
      };
    });
  }

  private dateOrNull(value: Date | string | null) {
    return value ? new Date(value).toISOString() : null;
  }
}
