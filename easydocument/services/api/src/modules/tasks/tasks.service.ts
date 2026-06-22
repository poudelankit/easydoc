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
import {
  ExpectedCompletionDateDto,
  TaskLifecycleNoteDto,
  UpdateTaskStatusDto
} from "./dto/task-lifecycle.dto";

const NEARBY_RADIUS_METERS = 25_000;

type TaskStatus =
  | "CREATED"
  | "ACCEPTED"
  | "DEAL_CONFIRMED"
  | "IN_PROGRESS"
  | "DOCUMENT_REQUESTED"
  | "VISITED_ORGANIZATION"
  | "DOCUMENT_COLLECTED"
  | "READY_FOR_DELIVERY"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

type TaskTimelineEventType = "STATUS_CHANGE" | "EXPECTED_DATE_UPDATED";

const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  CREATED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["DEAL_CONFIRMED", "CANCELLED"],
  DEAL_CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["DOCUMENT_REQUESTED"],
  DOCUMENT_REQUESTED: ["VISITED_ORGANIZATION"],
  VISITED_ORGANIZATION: ["DOCUMENT_COLLECTED"],
  DOCUMENT_COLLECTED: ["READY_FOR_DELIVERY"],
  READY_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: []
};

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
  expected_completion_date: Date | string | null;
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

interface LifecycleTaskRow extends QueryResultRow {
  id: string;
  customer_user_id: string;
  assigned_agent_user_id: string | null;
  status: TaskStatus;
  expected_completion_date: Date | string | null;
}

interface TaskStatusHistoryRow extends QueryResultRow {
  id: string;
  task_id: string;
  actor_user_id: string;
  actor_role: string;
  actor_full_name: string;
  actor_phone_number: string;
  event_type: TaskTimelineEventType;
  from_status: TaskStatus | null;
  to_status: TaskStatus;
  note: string | null;
  expected_completion_date: Date | string | null;
  created_at: Date | string;
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

      await this.writeStatusHistory(client, {
        taskId: task.id,
        actor: user,
        fromStatus: null,
        toStatus: "CREATED",
        note: "Task created"
      });

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

      await this.writeStatusHistory(client, {
        taskId: candidate.id,
        actor: user,
        fromStatus: candidate.status,
        toStatus: "ACCEPTED",
        note: "Task accepted"
      });

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

  async confirmDeal(
    user: AuthenticatedUser,
    taskId: string,
    dto: TaskLifecycleNoteDto,
    context: RequestContext
  ) {
    const confirmedTaskId = await this.database.transaction(async (client) => {
      const task = await this.getLifecycleTaskForUpdate(client, taskId);
      this.assertTaskCustomer(task, user, "confirm this task");
      await this.applyStatusTransition(client, task, user, "DEAL_CONFIRMED", dto.note);
      return task.id;
    });

    await this.audit.write({
      actorUserId: user.id,
      action: "TASK_DEAL_CONFIRMED",
      entityType: "document_tasks",
      entityId: confirmedTaskId,
      afterData: { status: "DEAL_CONFIRMED", note: this.cleanNote(dto.note) },
      context
    });

    return this.getTaskById(user, confirmedTaskId);
  }

  async setExpectedCompletionDate(
    user: AuthenticatedUser,
    taskId: string,
    dto: ExpectedCompletionDateDto,
    context: RequestContext
  ) {
    const expectedCompletionDate = this.normalizeExpectedDate(dto.expectedCompletionDate);
    const updatedTaskId = await this.database.transaction(async (client) => {
      const task = await this.getLifecycleTaskForUpdate(client, taskId);
      this.assertTaskAgent(task, user, "set the expected completion date");
      this.assertTaskIsActiveForExpectedDate(task);

      await client.query(
        `UPDATE document_tasks
         SET expected_completion_date = $2, updated_at = NOW()
         WHERE id = $1`,
        [task.id, expectedCompletionDate]
      );

      await this.writeStatusHistory(client, {
        taskId: task.id,
        actor: user,
        eventType: "EXPECTED_DATE_UPDATED",
        fromStatus: task.status,
        toStatus: task.status,
        note: dto.note,
        expectedCompletionDate
      });

      return task.id;
    });

    await this.audit.write({
      actorUserId: user.id,
      action: "TASK_EXPECTED_COMPLETION_DATE_SET",
      entityType: "document_tasks",
      entityId: updatedTaskId,
      afterData: {
        expectedCompletionDate,
        note: this.cleanNote(dto.note)
      },
      context
    });

    return this.getTaskById(user, updatedTaskId);
  }

  async updateProgressStatus(
    user: AuthenticatedUser,
    taskId: string,
    dto: UpdateTaskStatusDto,
    context: RequestContext
  ) {
    const updatedTaskId = await this.database.transaction(async (client) => {
      const task = await this.getLifecycleTaskForUpdate(client, taskId);
      this.assertTaskAgent(task, user, "update task progress");
      await this.applyStatusTransition(client, task, user, dto.status, dto.note);
      return task.id;
    });

    await this.audit.write({
      actorUserId: user.id,
      action: "TASK_PROGRESS_UPDATED",
      entityType: "document_tasks",
      entityId: updatedTaskId,
      afterData: { status: dto.status, note: this.cleanNote(dto.note) },
      context
    });

    return this.getTaskById(user, updatedTaskId);
  }

  async completeTask(
    user: AuthenticatedUser,
    taskId: string,
    dto: TaskLifecycleNoteDto,
    context: RequestContext
  ) {
    const completedTaskId = await this.database.transaction(async (client) => {
      const task = await this.getLifecycleTaskForUpdate(client, taskId);
      this.assertTaskCustomer(task, user, "complete this task");
      await this.applyStatusTransition(client, task, user, "COMPLETED", dto.note);
      return task.id;
    });

    await this.audit.write({
      actorUserId: user.id,
      action: "TASK_COMPLETED",
      entityType: "document_tasks",
      entityId: completedTaskId,
      afterData: { status: "COMPLETED", note: this.cleanNote(dto.note) },
      context
    });

    return this.getTaskById(user, completedTaskId);
  }

  async cancelTask(
    user: AuthenticatedUser,
    taskId: string,
    dto: TaskLifecycleNoteDto,
    context: RequestContext
  ) {
    const cancelledTaskId = await this.database.transaction(async (client) => {
      const task = await this.getLifecycleTaskForUpdate(client, taskId);
      this.assertTaskCustomer(task, user, "cancel this task");
      await this.applyStatusTransition(client, task, user, "CANCELLED", dto.note);
      return task.id;
    });

    await this.audit.write({
      actorUserId: user.id,
      action: "TASK_CANCELLED",
      entityType: "document_tasks",
      entityId: cancelledTaskId,
      afterData: { status: "CANCELLED", note: this.cleanNote(dto.note) },
      context
    });

    return this.getTaskById(user, cancelledTaskId);
  }

  async getTaskTimeline(user: AuthenticatedUser, taskId: string) {
    const task = await this.getLifecycleTask(taskId);
    this.assertTaskParticipant(task, user, "view this task timeline");

    const result = await this.database.query<TaskStatusHistoryRow>(
      `SELECT
         history.id,
         history.task_id,
         history.actor_user_id,
         history.actor_role,
         actor_user.full_name AS actor_full_name,
         actor_user.phone_number AS actor_phone_number,
         history.event_type,
         history.from_status::text AS from_status,
         history.to_status::text AS to_status,
         history.note,
         history.expected_completion_date,
         history.created_at
       FROM task_status_history history
       JOIN users actor_user ON actor_user.id = history.actor_user_id
       WHERE history.task_id = $1
       ORDER BY history.created_at ASC, history.id ASC`,
      [task.id]
    );

    return {
      taskId: task.id,
      currentStatus: task.status,
      expectedCompletionDate: this.dateOnlyOrNull(task.expected_completion_date),
      events: result.rows.map((row) => ({
        id: row.id,
        eventType: row.event_type,
        fromStatus: row.from_status,
        toStatus: row.to_status,
        note: row.note,
        expectedCompletionDate: this.dateOnlyOrNull(row.expected_completion_date),
        actor: {
          userId: row.actor_user_id,
          role: row.actor_role,
          fullName: row.actor_full_name,
          phoneNumber: row.actor_phone_number
        },
        createdAt: this.dateOrNull(row.created_at)
      }))
    };
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

  private async getLifecycleTaskForUpdate(client: Pick<PoolClient, "query">, taskId: string) {
    const result = await client.query<LifecycleTaskRow>(
      `SELECT
         id,
         customer_user_id,
         assigned_agent_user_id,
         status::text AS status,
         expected_completion_date
       FROM document_tasks
       WHERE id = $1
       FOR UPDATE`,
      [taskId]
    );

    const task = result.rows[0];
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    return task;
  }

  private async getLifecycleTask(taskId: string) {
    const result = await this.database.query<LifecycleTaskRow>(
      `SELECT
         id,
         customer_user_id,
         assigned_agent_user_id,
         status::text AS status,
         expected_completion_date
       FROM document_tasks
       WHERE id = $1`,
      [taskId]
    );

    const task = result.rows[0];
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    return task;
  }

  private async applyStatusTransition(
    client: Pick<PoolClient, "query">,
    task: LifecycleTaskRow,
    actor: AuthenticatedUser,
    toStatus: TaskStatus,
    note?: string
  ) {
    this.assertTransition(task.status, toStatus);

    await client.query(
      `UPDATE document_tasks
       SET status = $2, updated_at = NOW()
       WHERE id = $1`,
      [task.id, toStatus]
    );

    await this.writeStatusHistory(client, {
      taskId: task.id,
      actor,
      fromStatus: task.status,
      toStatus,
      note
    });
  }

  private async writeStatusHistory(
    client: Pick<PoolClient, "query">,
    entry: {
      taskId: string;
      actor: AuthenticatedUser;
      eventType?: TaskTimelineEventType;
      fromStatus: TaskStatus | null;
      toStatus: TaskStatus;
      note?: string;
      expectedCompletionDate?: string | null;
    }
  ) {
    await client.query(
      `INSERT INTO task_status_history (
         task_id,
         actor_user_id,
         actor_role,
         event_type,
         from_status,
         to_status,
         note,
         expected_completion_date
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.taskId,
        entry.actor.id,
        entry.actor.role,
        entry.eventType ?? "STATUS_CHANGE",
        entry.fromStatus,
        entry.toStatus,
        this.cleanNote(entry.note),
        entry.expectedCompletionDate ?? null
      ]
    );
  }

  private assertTransition(fromStatus: TaskStatus, toStatus: TaskStatus) {
    if (!TASK_STATUS_TRANSITIONS[fromStatus].includes(toStatus)) {
      throw new ConflictException(`Cannot move task from ${fromStatus} to ${toStatus}`);
    }
  }

  private assertTaskCustomer(task: LifecycleTaskRow, user: AuthenticatedUser, action: string) {
    if (user.role !== "CUSTOMER" || task.customer_user_id !== user.id) {
      throw new ForbiddenException(`Only the task customer can ${action}`);
    }
  }

  private assertTaskAgent(task: LifecycleTaskRow, user: AuthenticatedUser, action: string) {
    if (user.role !== "AGENT" || task.assigned_agent_user_id !== user.id) {
      throw new ForbiddenException(`Only the assigned agent can ${action}`);
    }
  }

  private assertTaskParticipant(task: LifecycleTaskRow, user: AuthenticatedUser, action: string) {
    const isCustomer = user.role === "CUSTOMER" && task.customer_user_id === user.id;
    const isAssignedAgent = user.role === "AGENT" && task.assigned_agent_user_id === user.id;
    if (!isCustomer && !isAssignedAgent) {
      throw new ForbiddenException(`Only task participants can ${action}`);
    }
  }

  private assertTaskIsActiveForExpectedDate(task: LifecycleTaskRow) {
    if (task.status === "CREATED" || task.status === "COMPLETED" || task.status === "CANCELLED") {
      throw new ConflictException(`Cannot set expected completion date while task is ${task.status}`);
    }
  }

  private normalizeExpectedDate(value: string) {
    const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateOnly) {
      return dateOnly[1];
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException("Expected completion date must be a valid date");
    }
    return parsed.toISOString().slice(0, 10);
  }

  private cleanNote(note?: string) {
    const clean = note?.trim();
    return clean ? clean : null;
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
        t.expected_completion_date,
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
      expectedCompletionDate: this.dateOnlyOrNull(row.expected_completion_date),
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

  private dateOnlyOrNull(value: Date | string | null) {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return String(value).slice(0, 10);
  }
}
