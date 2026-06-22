import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PoolClient, QueryResultRow } from "pg";
import { AuthenticatedUser, RequestContext } from "../../common/types/authenticated-user";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";
import { RejectAgentDto } from "./dto/reject-agent.dto";

type AgentStatus = "DRAFT" | "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "SUSPENDED";
type VerificationDecision = "APPROVED" | "REJECTED";
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

const TASK_STATUSES: TaskStatus[] = [
  "CREATED",
  "ACCEPTED",
  "DEAL_CONFIRMED",
  "IN_PROGRESS",
  "DOCUMENT_REQUESTED",
  "VISITED_ORGANIZATION",
  "DOCUMENT_COLLECTED",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED"
];

interface AgentRow extends QueryResultRow {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  address_text: string | null;
  citizenship_number: string;
  permanent_address_text: string;
  permanent_latitude: string | number;
  permanent_longitude: string | number;
  status: AgentStatus;
  verification_notes: string | null;
  verification_decision: VerificationDecision | null;
  verification_decided_by_user_id: string | null;
  verification_decided_by_full_name: string | null;
  verification_decided_at: Date | string | null;
  verification_rejection_reason: string | null;
  is_available: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  citizenship_files: unknown;
}

interface TaskRow extends QueryResultRow {
  id: string;
  customer_user_id: string;
  customer_full_name: string;
  customer_phone_number: string;
  assigned_agent_user_id: string | null;
  assigned_agent_full_name: string | null;
  assigned_agent_phone_number: string | null;
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
}

interface TaskTimelineRow extends QueryResultRow {
  id: string;
  task_id: string;
  actor_user_id: string;
  actor_role: string;
  actor_full_name: string;
  actor_phone_number: string;
  event_type: "STATUS_CHANGE" | "EXPECTED_DATE_UPDATED";
  from_status: TaskStatus | null;
  to_status: TaskStatus;
  note: string | null;
  expected_completion_date: Date | string | null;
  created_at: Date | string;
}

interface CommunicationAuditRow extends QueryResultRow {
  task_id: string;
  room_id: string | null;
  room_created_at: Date | string | null;
  message_count: string | number;
  attachment_count: string | number;
  call_count: string | number;
  last_activity_at: Date | string | null;
}

interface QueryExecutor {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<{
    rows: T[];
  }>;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService
  ) {}

  async getDashboard() {
    const countsResult = await this.database.query<{
      pending_agents: string | number;
      verified_agents: string | number;
      rejected_agents: string | number;
      total_tasks: string | number;
      active_tasks: string | number;
      open_communication_rooms: string | number;
      call_sessions: string | number;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM agent_profiles WHERE status = 'PENDING_VERIFICATION') AS pending_agents,
         (SELECT COUNT(*) FROM agent_profiles WHERE status = 'VERIFIED') AS verified_agents,
         (SELECT COUNT(*) FROM agent_profiles WHERE status = 'REJECTED') AS rejected_agents,
         (SELECT COUNT(*) FROM document_tasks) AS total_tasks,
         (SELECT COUNT(*) FROM document_tasks WHERE status NOT IN ('COMPLETED','CANCELLED')) AS active_tasks,
         (SELECT COUNT(*) FROM communication_rooms) AS open_communication_rooms,
         (SELECT COUNT(*) FROM call_sessions) AS call_sessions`
    );

    const taskStatusResult = await this.database.query<{ status: TaskStatus; count: string | number }>(
      `SELECT status::text AS status, COUNT(*) AS count
       FROM document_tasks
       GROUP BY status
       ORDER BY status`
    );

    const counts = countsResult.rows[0];
    return {
      agentVerification: {
        pending: Number(counts?.pending_agents ?? 0),
        verified: Number(counts?.verified_agents ?? 0),
        rejected: Number(counts?.rejected_agents ?? 0)
      },
      tasks: {
        total: Number(counts?.total_tasks ?? 0),
        active: Number(counts?.active_tasks ?? 0),
        byStatus: taskStatusResult.rows.map((row) => ({
          status: row.status,
          count: Number(row.count)
        }))
      },
      communication: {
        roomCount: Number(counts?.open_communication_rooms ?? 0),
        callCount: Number(counts?.call_sessions ?? 0)
      }
    };
  }

  async listPendingAgents() {
    const result = await this.database.query<AgentRow>(
      `${this.agentSelect(false)}
       WHERE profile.status = 'PENDING_VERIFICATION'
       ${this.agentGroupBy()}
       ORDER BY profile.created_at ASC`
    );

    return result.rows.map((row) => this.mapAgent(row, false));
  }

  async getAgent(agentId: string) {
    const row = await this.loadAgent(agentId);
    return this.mapAgent(row, true);
  }

  async approveAgent(agentId: string, admin: AuthenticatedUser, context: RequestContext) {
    const updatedAgent = await this.database.transaction(async (client) => {
      await this.lockAgent(client, agentId);
      const before = await this.loadAgent(agentId, client);
      this.assertAgentCanBeDecided(before.status);

      await client.query(
        `UPDATE agent_profiles
         SET
           status = 'VERIFIED',
           verification_notes = NULL,
           verification_decision = 'APPROVED',
           verification_decided_by_user_id = $2,
           verification_decided_at = NOW(),
           verification_rejection_reason = NULL,
           updated_at = NOW()
         WHERE id = $1`,
        [agentId, admin.id]
      );

      return { before, after: await this.loadAgent(agentId, client) };
    });

    await this.audit.write({
      actorUserId: admin.id,
      action: "AGENT_VERIFICATION_APPROVED",
      entityType: "agent_profiles",
      entityId: agentId,
      beforeData: this.mapAgent(updatedAgent.before, true),
      afterData: this.mapAgent(updatedAgent.after, true),
      context
    });

    return this.mapAgent(updatedAgent.after, true);
  }

  async rejectAgent(
    agentId: string,
    admin: AuthenticatedUser,
    dto: RejectAgentDto,
    context: RequestContext
  ) {
    const reason = dto.reason.trim();
    if (!reason) {
      throw new BadRequestException("Rejection reason is required");
    }

    const updatedAgent = await this.database.transaction(async (client) => {
      await this.lockAgent(client, agentId);
      const before = await this.loadAgent(agentId, client);
      this.assertAgentCanBeDecided(before.status);

      await client.query(
        `UPDATE agent_profiles
         SET
           status = 'REJECTED',
           verification_notes = $2,
           verification_decision = 'REJECTED',
           verification_decided_by_user_id = $3,
           verification_decided_at = NOW(),
           verification_rejection_reason = $2,
           updated_at = NOW()
         WHERE id = $1`,
        [agentId, reason, admin.id]
      );

      return { before, after: await this.loadAgent(agentId, client) };
    });

    await this.audit.write({
      actorUserId: admin.id,
      action: "AGENT_VERIFICATION_REJECTED",
      entityType: "agent_profiles",
      entityId: agentId,
      beforeData: this.mapAgent(updatedAgent.before, true),
      afterData: this.mapAgent(updatedAgent.after, true),
      context
    });

    return this.mapAgent(updatedAgent.after, true);
  }

  async listTasks(status?: string) {
    const normalizedStatus = this.normalizeTaskStatus(status);
    const result = await this.database.query<TaskRow>(
      `${this.taskSelect()}
       WHERE ($1::text IS NULL OR task.status::text = $1)
       ORDER BY task.created_at DESC
       LIMIT 100`,
      [normalizedStatus]
    );

    return result.rows.map((row) => this.mapTask(row, false));
  }

  async getTask(taskId: string) {
    const row = await this.loadTask(taskId);
    return this.mapTask(row, true);
  }

  async getTaskTimeline(taskId: string) {
    const task = await this.loadTask(taskId);
    const result = await this.database.query<TaskTimelineRow>(
      `SELECT
         history.id,
         history.task_id,
         history.actor_user_id,
         history.actor_role,
         actor.full_name AS actor_full_name,
         actor.phone_number AS actor_phone_number,
         history.event_type,
         history.from_status::text AS from_status,
         history.to_status::text AS to_status,
         history.note,
         history.expected_completion_date,
         history.created_at
       FROM task_status_history history
       JOIN users actor ON actor.id = history.actor_user_id
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

  async getCommunicationAudit(taskId: string) {
    await this.loadTask(taskId);

    const result = await this.database.query<CommunicationAuditRow>(
      `SELECT
         task.id AS task_id,
         room.id AS room_id,
         room.created_at AS room_created_at,
         COALESCE(message_stats.message_count, 0) AS message_count,
         COALESCE(attachment_stats.attachment_count, 0) AS attachment_count,
         COALESCE(call_stats.call_count, 0) AS call_count,
         CASE
           WHEN room.id IS NULL THEN NULL
           ELSE GREATEST(
             COALESCE(room.updated_at, '-infinity'::timestamptz),
             COALESCE(message_stats.last_message_at, '-infinity'::timestamptz),
             COALESCE(attachment_stats.last_attachment_at, '-infinity'::timestamptz),
             COALESCE(call_stats.last_call_at, '-infinity'::timestamptz)
           )
         END AS last_activity_at
       FROM document_tasks task
       LEFT JOIN communication_rooms room ON room.task_id = task.id
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS message_count, MAX(created_at) AS last_message_at
         FROM communication_messages
         WHERE room_id = room.id
       ) message_stats ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS attachment_count, MAX(created_at) AS last_attachment_at
         FROM communication_attachments
         WHERE room_id = room.id
       ) attachment_stats ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS call_count, MAX(updated_at) AS last_call_at
         FROM call_sessions
         WHERE task_id = task.id
       ) call_stats ON TRUE
       WHERE task.id = $1
       LIMIT 1`,
      [taskId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Task not found");
    }

    return {
      taskId: row.task_id,
      roomExists: Boolean(row.room_id),
      roomId: row.room_id,
      roomCreatedAt: this.dateOrNull(row.room_created_at),
      messageCount: Number(row.message_count),
      attachmentCount: Number(row.attachment_count),
      callCount: Number(row.call_count),
      lastActivityAt: this.dateOrNull(row.last_activity_at),
      rawMessageBodyVisible: false
    };
  }

  private async loadAgent(
    agentId: string,
    executor: QueryExecutor = this.database
  ) {
    const result = await executor.query<AgentRow>(
      `${this.agentSelect(true)}
       WHERE profile.id = $1
       ${this.agentGroupBy()}
       LIMIT 1`,
      [agentId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Agent profile not found");
    }
    return row;
  }

  private async lockAgent(client: QueryExecutor, agentId: string) {
    const result = await client.query<{ id: string }>(
      `SELECT id
       FROM agent_profiles
       WHERE id = $1
       FOR UPDATE`,
      [agentId]
    );

    if (!result.rows[0]) {
      throw new NotFoundException("Agent profile not found");
    }
  }

  private async loadTask(taskId: string) {
    const result = await this.database.query<TaskRow>(
      `${this.taskSelect()}
       WHERE task.id = $1
       LIMIT 1`,
      [taskId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Task not found");
    }
    return row;
  }

  private agentSelect(includeFiles: boolean) {
    return `SELECT
        profile.id,
        profile.user_id,
        user_account.full_name,
        user_account.phone_number,
        user_account.address_text,
        profile.citizenship_number,
        profile.permanent_address_text,
        ST_Y(profile.permanent_location::geometry) AS permanent_latitude,
        ST_X(profile.permanent_location::geometry) AS permanent_longitude,
        profile.status::text AS status,
        profile.verification_notes,
        profile.verification_decision,
        profile.verification_decided_by_user_id,
        deciding_admin.full_name AS verification_decided_by_full_name,
        profile.verification_decided_at,
        profile.verification_rejection_reason,
        profile.is_available,
        profile.created_at,
        profile.updated_at,
        ${
          includeFiles
            ? `COALESCE(
                jsonb_agg(
                  DISTINCT jsonb_build_object(
                    'fileId', file.id,
                    'kind', CASE
                      WHEN file.object_key = profile.citizenship_front_url THEN 'CITIZENSHIP_FRONT'
                      WHEN file.object_key = profile.citizenship_back_url THEN 'CITIZENSHIP_BACK'
                      WHEN file.object_key = profile.selfie_url THEN 'SELFIE'
                      ELSE 'KYC'
                    END,
                    'objectKey', file.object_key,
                    'originalFilename', file.original_filename,
                    'mimeType', file.mime_type,
                    'sizeBytes', file.size_bytes,
                    'status', file.status,
                    'createdAt', file.created_at
                  )
                ) FILTER (WHERE file.id IS NOT NULL),
                '[]'::jsonb
              )`
            : "'[]'::jsonb"
        } AS citizenship_files
      FROM agent_profiles profile
      JOIN users user_account ON user_account.id = profile.user_id
      LEFT JOIN users deciding_admin ON deciding_admin.id = profile.verification_decided_by_user_id
      ${
        includeFiles
          ? `LEFT JOIN file_metadata file
               ON file.object_key IN (
                 profile.citizenship_front_url,
                 profile.citizenship_back_url,
                 profile.selfie_url
               )`
          : ""
      }`;
  }

  private agentGroupBy() {
    return `GROUP BY
      profile.id,
      user_account.id,
      deciding_admin.id`;
  }

  private taskSelect() {
    return `SELECT
        task.id,
        task.customer_user_id,
        customer.full_name AS customer_full_name,
        customer.phone_number AS customer_phone_number,
        task.assigned_agent_user_id,
        agent.full_name AS assigned_agent_full_name,
        agent.phone_number AS assigned_agent_phone_number,
        task.task_name,
        task.document_type,
        task.organization_name,
        task.organization_address,
        ST_Y(task.organization_location::geometry) AS organization_latitude,
        ST_X(task.organization_location::geometry) AS organization_longitude,
        task.request_description,
        task.status::text AS status,
        task.accepted_at,
        task.expected_completion_date,
        task.created_at,
        task.updated_at
      FROM document_tasks task
      JOIN users customer ON customer.id = task.customer_user_id
      LEFT JOIN users agent ON agent.id = task.assigned_agent_user_id`;
  }

  private assertAgentCanBeDecided(status: AgentStatus) {
    if (status === "VERIFIED" || status === "SUSPENDED") {
      throw new ConflictException(`Agent profile is already ${status}`);
    }
  }

  private normalizeTaskStatus(status?: string) {
    if (!status) {
      return null;
    }
    const normalizedStatus = status.trim().toUpperCase();
    if (!TASK_STATUSES.includes(normalizedStatus as TaskStatus)) {
      throw new BadRequestException("Unsupported task status filter");
    }
    return normalizedStatus;
  }

  private mapAgent(row: AgentRow, includeFiles: boolean) {
    return {
      id: row.id,
      userId: row.user_id,
      user: {
        id: row.user_id,
        fullName: row.full_name,
        phoneNumber: row.phone_number,
        addressText: row.address_text
      },
      citizenshipNumber: row.citizenship_number,
      permanentAddressText: row.permanent_address_text,
      permanentLocation: {
        latitude: Number(row.permanent_latitude),
        longitude: Number(row.permanent_longitude)
      },
      status: row.status,
      isAvailable: row.is_available,
      verification: {
        decision: row.verification_decision,
        decidedByAdminUserId: row.verification_decided_by_user_id,
        decidedByAdminName: row.verification_decided_by_full_name,
        decidedAt: this.dateOrNull(row.verification_decided_at),
        reason: row.verification_rejection_reason ?? row.verification_notes
      },
      citizenshipFiles: includeFiles ? this.arrayFromJson(row.citizenship_files) : [],
      createdAt: this.dateOrNull(row.created_at),
      updatedAt: this.dateOrNull(row.updated_at)
    };
  }

  private mapTask(row: TaskRow, includeDescription: boolean) {
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
      requestDescription: includeDescription ? row.request_description : undefined,
      status: row.status,
      customer: {
        userId: row.customer_user_id,
        fullName: row.customer_full_name,
        phoneNumber: row.customer_phone_number
      },
      assignedAgent: row.assigned_agent_user_id
        ? {
            userId: row.assigned_agent_user_id,
            fullName: row.assigned_agent_full_name,
            phoneNumber: row.assigned_agent_phone_number
          }
        : null,
      acceptedAt: this.dateOrNull(row.accepted_at),
      expectedCompletionDate: this.dateOnlyOrNull(row.expected_completion_date),
      createdAt: this.dateOrNull(row.created_at),
      updatedAt: this.dateOrNull(row.updated_at)
    };
  }

  private arrayFromJson(value: unknown) {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private dateOrNull(value: Date | string | null) {
    return value ? new Date(value).toISOString() : null;
  }

  private dateOnlyOrNull(value: Date | string | null) {
    if (!value) {
      return null;
    }
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    return new Date(value).toISOString().slice(0, 10);
  }
}
