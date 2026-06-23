import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PoolClient, QueryResultRow } from "pg";
import { AuthenticatedUser, RequestContext } from "../../common/types/authenticated-user";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";
import {
  AddMediationNoteDto,
  DISPUTE_STATUSES,
  DisputeStatus,
  ResolveDisputeDto,
  UpdateDisputeStatusDto
} from "./dto/admin-dispute.dto";
import { CreateDisputeDto } from "./dto/create-dispute.dto";

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

const TERMINAL_DISPUTE_STATUSES: DisputeStatus[] = ["RESOLVED", "REJECTED", "CANCELLED"];

interface QueryExecutor {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<{
    rows: T[];
  }>;
}

interface DisputableTaskRow extends QueryResultRow {
  id: string;
  task_name: string;
  status: TaskStatus;
  customer_user_id: string;
  customer_full_name: string;
  customer_phone_number: string;
  assigned_agent_user_id: string | null;
  agent_full_name: string | null;
  agent_phone_number: string | null;
  room_id: string | null;
}

interface DisputeRow extends QueryResultRow {
  id: string;
  task_id: string;
  task_name: string;
  task_status: TaskStatus;
  customer_user_id: string;
  customer_full_name: string;
  customer_phone_number: string;
  agent_user_id: string;
  agent_full_name: string;
  agent_phone_number: string;
  room_id: string;
  reason: string;
  description: string;
  opened_by_user_id: string;
  opened_by_full_name: string;
  opened_by_phone_number: string;
  opened_by_role: "CUSTOMER" | "AGENT";
  status: DisputeStatus;
  resolution_summary: string | null;
  resolved_by_admin_user_id: string | null;
  resolved_by_admin_full_name: string | null;
  resolved_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface DisputeHistoryRow extends QueryResultRow {
  id: string;
  dispute_id: string;
  actor_user_id: string;
  actor_role: string;
  actor_full_name: string;
  old_status: DisputeStatus | null;
  new_status: DisputeStatus;
  note: string | null;
  created_at: Date | string;
}

interface MediationNoteRow extends QueryResultRow {
  id: string;
  admin_user_id: string;
  admin_full_name: string;
  note: string;
  created_at: Date | string;
}

interface TaskTimelineRow extends QueryResultRow {
  id: string;
  actor_user_id: string;
  actor_role: string;
  actor_full_name: string;
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

@Injectable()
export class DisputesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService
  ) {}

  async createTaskDispute(
    taskId: string,
    user: AuthenticatedUser,
    dto: CreateDisputeDto,
    context: RequestContext
  ) {
    this.assertParticipantRole(user);
    const disputeId = await this.database.transaction(async (client) => {
      const task = await this.loadDisputableTask(client, taskId, true);
      this.assertTaskParticipant(task, user);
      this.assertTaskCanOpenDispute(task);

      const result = await client.query<{ id: string }>(
        `INSERT INTO task_disputes (
           task_id,
           customer_user_id,
           agent_user_id,
           room_id,
           reason,
           description,
           opened_by_user_id,
           opened_by_role,
           status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OPEN')
         RETURNING id`,
        [
          task.id,
          task.customer_user_id,
          task.assigned_agent_user_id,
          task.room_id,
          dto.reason.trim(),
          dto.description.trim(),
          user.id,
          user.role
        ]
      );

      const dispute = result.rows[0];
      if (!dispute) {
        throw new BadRequestException("Dispute could not be opened");
      }

      await this.writeDisputeHistory(client, {
        disputeId: dispute.id,
        actor: user,
        oldStatus: null,
        newStatus: "OPEN",
        note: dto.reason.trim()
      });

      return dispute.id;
    });

    await this.audit.write({
      actorUserId: user.id,
      action: "TASK_DISPUTE_OPENED",
      entityType: "task_disputes",
      entityId: disputeId,
      afterData: { taskId, reason: dto.reason.trim(), openedByRole: user.role },
      context
    });

    return this.getParticipantDispute(disputeId, user);
  }

  async listTaskDisputes(taskId: string, user: AuthenticatedUser) {
    this.assertParticipantRole(user);
    const task = await this.loadDisputableTask(this.database, taskId);
    this.assertTaskParticipant(task, user);

    const result = await this.database.query<DisputeRow>(
      `${this.disputeSelect()}
       WHERE dispute.task_id = $1
       ORDER BY dispute.created_at DESC`,
      [taskId]
    );

    return result.rows.map((row) => this.mapParticipantDispute(row));
  }

  async getParticipantDispute(disputeId: string, user: AuthenticatedUser) {
    this.assertParticipantRole(user);
    const dispute = await this.loadDispute(disputeId);
    if (dispute.customer_user_id !== user.id && dispute.agent_user_id !== user.id) {
      throw new ForbiddenException("Only task participants can view this dispute");
    }

    return this.mapParticipantDispute(dispute);
  }

  async listAdminDisputes(status?: string) {
    const normalizedStatus = this.normalizeDisputeStatus(status);
    const result = await this.database.query<DisputeRow>(
      `${this.disputeSelect()}
       WHERE ($1::text IS NULL OR dispute.status::text = $1)
       ORDER BY dispute.created_at DESC
       LIMIT 100`,
      [normalizedStatus]
    );

    return result.rows.map((row) => this.mapAdminDisputeSummary(row));
  }

  async getAdminDispute(disputeId: string) {
    const dispute = await this.loadDispute(disputeId);
    const [history, notes, taskTimeline, communicationAudit] = await Promise.all([
      this.loadStatusHistory(dispute.id),
      this.loadMediationNotes(dispute.id),
      this.loadTaskTimeline(dispute.task_id),
      this.loadCommunicationAudit(dispute.task_id)
    ]);

    return {
      ...this.mapAdminDisputeSummary(dispute),
      description: dispute.description,
      statusHistory: history.map((row) => this.mapHistory(row, true)),
      mediationNotes: notes.map((row) => ({
        id: row.id,
        adminUserId: row.admin_user_id,
        adminFullName: row.admin_full_name,
        note: row.note,
        createdAt: this.dateOrNull(row.created_at)
      })),
      taskTimeline: taskTimeline.map((row) => ({
        id: row.id,
        eventType: row.event_type,
        fromStatus: row.from_status,
        toStatus: row.to_status,
        note: row.note,
        expectedCompletionDate: this.dateOnlyOrNull(row.expected_completion_date),
        actor: {
          userId: row.actor_user_id,
          role: row.actor_role,
          fullName: row.actor_full_name
        },
        createdAt: this.dateOrNull(row.created_at)
      })),
      communicationAudit
    };
  }

  async addMediationNote(
    disputeId: string,
    admin: AuthenticatedUser,
    dto: AddMediationNoteDto,
    context: RequestContext
  ) {
    const dispute = await this.loadDispute(disputeId);
    const note = dto.note.trim();
    if (!note) {
      throw new BadRequestException("Mediation note is required");
    }

    const result = await this.database.query<{ id: string }>(
      `INSERT INTO dispute_mediation_notes (dispute_id, admin_user_id, note)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [dispute.id, admin.id, note]
    );

    await this.audit.write({
      actorUserId: admin.id,
      action: "DISPUTE_MEDIATION_NOTE_ADDED",
      entityType: "dispute_mediation_notes",
      entityId: result.rows[0]?.id,
      afterData: { disputeId },
      context
    });

    return this.getAdminDispute(dispute.id);
  }

  async updateDisputeStatus(
    disputeId: string,
    admin: AuthenticatedUser,
    dto: UpdateDisputeStatusDto,
    context: RequestContext
  ) {
    if (dto.status === "RESOLVED") {
      throw new BadRequestException("Use the dispute resolution endpoint to resolve a dispute");
    }

    await this.database.transaction(async (client) => {
      const dispute = await this.loadDisputeForUpdate(client, disputeId);
      this.assertDisputeCanChangeStatus(dispute.status);
      this.assertStatusActuallyChanges(dispute.status, dto.status);

      await client.query(
        `UPDATE task_disputes
         SET status = $2::dispute_status, updated_at = NOW()
         WHERE id = $1`,
        [dispute.id, dto.status]
      );

      await this.writeDisputeHistory(client, {
        disputeId: dispute.id,
        actor: admin,
        oldStatus: dispute.status,
        newStatus: dto.status,
        note: dto.note
      });
    });

    await this.audit.write({
      actorUserId: admin.id,
      action: "DISPUTE_STATUS_UPDATED",
      entityType: "task_disputes",
      entityId: disputeId,
      afterData: { status: dto.status, note: this.cleanNote(dto.note) },
      context
    });

    return this.getAdminDispute(disputeId);
  }

  async resolveDispute(
    disputeId: string,
    admin: AuthenticatedUser,
    dto: ResolveDisputeDto,
    context: RequestContext
  ) {
    const resolutionSummary = dto.resolutionSummary.trim();
    if (!resolutionSummary) {
      throw new BadRequestException("Resolution summary is required");
    }

    await this.database.transaction(async (client) => {
      const dispute = await this.loadDisputeForUpdate(client, disputeId);
      this.assertDisputeCanChangeStatus(dispute.status);

      await client.query(
        `UPDATE task_disputes
         SET
           status = 'RESOLVED',
           resolution_summary = $2,
           resolved_by_admin_user_id = $3,
           resolved_at = NOW(),
           updated_at = NOW()
         WHERE id = $1`,
        [dispute.id, resolutionSummary, admin.id]
      );

      await this.writeDisputeHistory(client, {
        disputeId: dispute.id,
        actor: admin,
        oldStatus: dispute.status,
        newStatus: "RESOLVED",
        note: resolutionSummary
      });
    });

    await this.audit.write({
      actorUserId: admin.id,
      action: "DISPUTE_RESOLVED",
      entityType: "task_disputes",
      entityId: disputeId,
      afterData: { resolutionSummary },
      context
    });

    return this.getAdminDispute(disputeId);
  }

  private async loadDisputableTask(
    executor: QueryExecutor,
    taskId: string,
    forUpdate = false
  ) {
    const result = await executor.query<DisputableTaskRow>(
      `SELECT
         task.id,
         task.task_name,
         task.status::text AS status,
         task.customer_user_id,
         customer.full_name AS customer_full_name,
         customer.phone_number AS customer_phone_number,
         task.assigned_agent_user_id,
         agent.full_name AS agent_full_name,
         agent.phone_number AS agent_phone_number,
         room.id AS room_id
       FROM document_tasks task
       JOIN users customer ON customer.id = task.customer_user_id
       LEFT JOIN users agent ON agent.id = task.assigned_agent_user_id
       LEFT JOIN communication_rooms room ON room.task_id = task.id
       WHERE task.id = $1
       ${forUpdate ? "FOR UPDATE OF task" : ""}
       LIMIT 1`,
      [taskId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Task not found");
    }
    return row;
  }

  private async loadDispute(disputeId: string) {
    const result = await this.database.query<DisputeRow>(
      `${this.disputeSelect()}
       WHERE dispute.id = $1
       LIMIT 1`,
      [disputeId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Dispute not found");
    }
    return row;
  }

  private async loadDisputeForUpdate(client: QueryExecutor, disputeId: string) {
    const result = await client.query<DisputeRow>(
      `${this.disputeSelect()}
       WHERE dispute.id = $1
       FOR UPDATE OF dispute
       LIMIT 1`,
      [disputeId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Dispute not found");
    }
    return row;
  }

  private disputeSelect() {
    return `SELECT
        dispute.id,
        dispute.task_id,
        task.task_name,
        task.status::text AS task_status,
        dispute.customer_user_id,
        customer.full_name AS customer_full_name,
        customer.phone_number AS customer_phone_number,
        dispute.agent_user_id,
        agent.full_name AS agent_full_name,
        agent.phone_number AS agent_phone_number,
        dispute.room_id,
        dispute.reason,
        dispute.description,
        dispute.opened_by_user_id,
        opened_by.full_name AS opened_by_full_name,
        opened_by.phone_number AS opened_by_phone_number,
        dispute.opened_by_role,
        dispute.status::text AS status,
        dispute.resolution_summary,
        dispute.resolved_by_admin_user_id,
        resolved_by.full_name AS resolved_by_admin_full_name,
        dispute.resolved_at,
        dispute.created_at,
        dispute.updated_at
      FROM task_disputes dispute
      JOIN document_tasks task ON task.id = dispute.task_id
      JOIN users customer ON customer.id = dispute.customer_user_id
      JOIN users agent ON agent.id = dispute.agent_user_id
      JOIN users opened_by ON opened_by.id = dispute.opened_by_user_id
      LEFT JOIN users resolved_by ON resolved_by.id = dispute.resolved_by_admin_user_id`;
  }

  private async loadStatusHistory(disputeId: string) {
    const result = await this.database.query<DisputeHistoryRow>(
      `SELECT
         history.id,
         history.dispute_id,
         history.actor_user_id,
         history.actor_role,
         actor.full_name AS actor_full_name,
         history.old_status::text AS old_status,
         history.new_status::text AS new_status,
         history.note,
         history.created_at
       FROM dispute_status_history history
       JOIN users actor ON actor.id = history.actor_user_id
       WHERE history.dispute_id = $1
       ORDER BY history.created_at ASC, history.id ASC`,
      [disputeId]
    );
    return result.rows;
  }

  private async loadMediationNotes(disputeId: string) {
    const result = await this.database.query<MediationNoteRow>(
      `SELECT
         note.id,
         note.admin_user_id,
         admin.full_name AS admin_full_name,
         note.note,
         note.created_at
       FROM dispute_mediation_notes note
       JOIN users admin ON admin.id = note.admin_user_id
       WHERE note.dispute_id = $1
       ORDER BY note.created_at DESC, note.id DESC`,
      [disputeId]
    );
    return result.rows;
  }

  private async loadTaskTimeline(taskId: string) {
    const result = await this.database.query<TaskTimelineRow>(
      `SELECT
         history.id,
         history.actor_user_id,
         history.actor_role,
         actor.full_name AS actor_full_name,
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
      [taskId]
    );
    return result.rows;
  }

  private async loadCommunicationAudit(taskId: string) {
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
    return {
      taskId,
      roomExists: Boolean(row?.room_id),
      roomId: row?.room_id ?? null,
      roomCreatedAt: this.dateOrNull(row?.room_created_at ?? null),
      messageCount: Number(row?.message_count ?? 0),
      attachmentCount: Number(row?.attachment_count ?? 0),
      callCount: Number(row?.call_count ?? 0),
      lastActivityAt: this.dateOrNull(row?.last_activity_at ?? null),
      rawMessageBodyVisible: false
    };
  }

  private async writeDisputeHistory(
    executor: QueryExecutor,
    params: {
      disputeId: string;
      actor: AuthenticatedUser;
      oldStatus: DisputeStatus | null;
      newStatus: DisputeStatus;
      note?: string;
    }
  ) {
    await executor.query(
      `INSERT INTO dispute_status_history (
         dispute_id,
         actor_user_id,
         actor_role,
         old_status,
         new_status,
         note
       )
       VALUES ($1::uuid, $2::uuid, $3::text, $4::dispute_status, $5::dispute_status, $6::text)`,
      [
        params.disputeId,
        params.actor.id,
        params.actor.role,
        params.oldStatus,
        params.newStatus,
        this.cleanNote(params.note)
      ]
    );
  }

  private assertParticipantRole(user: AuthenticatedUser) {
    if (user.role !== "CUSTOMER" && user.role !== "AGENT") {
      throw new ForbiddenException("Only task customers and assigned agents can use disputes");
    }
  }

  private assertTaskParticipant(task: DisputableTaskRow, user: AuthenticatedUser) {
    if (user.role === "CUSTOMER" && task.customer_user_id === user.id) {
      return;
    }
    if (user.role === "AGENT" && task.assigned_agent_user_id === user.id) {
      return;
    }
    throw new ForbiddenException("Only the task customer and assigned agent can access disputes");
  }

  private assertTaskCanOpenDispute(task: DisputableTaskRow) {
    if (!task.assigned_agent_user_id || !task.room_id) {
      throw new ConflictException("Dispute requires an assigned task with a communication room");
    }
    if (task.status === "CANCELLED" || task.status === "COMPLETED") {
      throw new ConflictException(`Cannot open a dispute for a ${task.status} task`);
    }
  }

  private assertDisputeCanChangeStatus(status: DisputeStatus) {
    if (TERMINAL_DISPUTE_STATUSES.includes(status)) {
      throw new ConflictException(`Cannot update a ${status} dispute`);
    }
  }

  private assertStatusActuallyChanges(oldStatus: DisputeStatus, newStatus: DisputeStatus) {
    if (oldStatus === newStatus) {
      throw new ConflictException(`Dispute is already ${newStatus}`);
    }
  }

  private normalizeDisputeStatus(status?: string) {
    if (!status) {
      return null;
    }
    const normalizedStatus = status.trim().toUpperCase();
    if (!DISPUTE_STATUSES.includes(normalizedStatus as DisputeStatus)) {
      throw new BadRequestException("Unsupported dispute status filter");
    }
    return normalizedStatus;
  }

  private mapParticipantDispute(row: DisputeRow) {
    return {
      id: row.id,
      taskId: row.task_id,
      taskName: row.task_name,
      roomId: row.room_id,
      reason: row.reason,
      description: row.description,
      openedBy: {
        userId: row.opened_by_user_id,
        role: row.opened_by_role,
        fullName: row.opened_by_full_name
      },
      status: row.status,
      resolutionSummary: row.resolution_summary,
      resolvedAt: this.dateOrNull(row.resolved_at),
      createdAt: this.dateOrNull(row.created_at),
      updatedAt: this.dateOrNull(row.updated_at)
    };
  }

  private mapAdminDisputeSummary(row: DisputeRow) {
    return {
      id: row.id,
      task: {
        id: row.task_id,
        taskName: row.task_name,
        status: row.task_status
      },
      customer: {
        userId: row.customer_user_id,
        fullName: row.customer_full_name,
        phoneNumber: row.customer_phone_number
      },
      agent: {
        userId: row.agent_user_id,
        fullName: row.agent_full_name,
        phoneNumber: row.agent_phone_number
      },
      roomId: row.room_id,
      reason: row.reason,
      openedBy: {
        userId: row.opened_by_user_id,
        role: row.opened_by_role,
        fullName: row.opened_by_full_name,
        phoneNumber: row.opened_by_phone_number
      },
      status: row.status,
      resolutionSummary: row.resolution_summary,
      resolvedByAdmin: row.resolved_by_admin_user_id
        ? {
            userId: row.resolved_by_admin_user_id,
            fullName: row.resolved_by_admin_full_name
          }
        : null,
      resolvedAt: this.dateOrNull(row.resolved_at),
      createdAt: this.dateOrNull(row.created_at),
      updatedAt: this.dateOrNull(row.updated_at)
    };
  }

  private mapHistory(row: DisputeHistoryRow, includeNote: boolean) {
    return {
      id: row.id,
      disputeId: row.dispute_id,
      actor: {
        userId: row.actor_user_id,
        role: row.actor_role,
        fullName: row.actor_full_name
      },
      oldStatus: row.old_status,
      newStatus: row.new_status,
      note: includeNote ? row.note : null,
      createdAt: this.dateOrNull(row.created_at)
    };
  }

  private cleanNote(note?: string) {
    const cleaned = note?.trim();
    return cleaned ? cleaned : null;
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
