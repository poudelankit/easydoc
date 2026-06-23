import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { PoolClient, QueryResultRow } from "pg";
import { AuthenticatedUser, RequestContext } from "../../common/types/authenticated-user";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CallEndStatus, CreateCallDto, EndCallDto } from "./dto/call.dto";

type CallType = "AUDIO" | "VIDEO";
type CallStatus = "REQUESTED" | "RINGING" | "ACCEPTED" | "DECLINED" | "MISSED" | "ENDED" | "FAILED";

const ACTIVE_TASK_STATUSES = [
  "ACCEPTED",
  "DEAL_CONFIRMED",
  "IN_PROGRESS",
  "DOCUMENT_REQUESTED",
  "VISITED_ORGANIZATION",
  "DOCUMENT_COLLECTED",
  "READY_FOR_DELIVERY",
  "DELIVERED"
];

const TERMINAL_CALL_STATUSES: CallStatus[] = ["DECLINED", "MISSED", "ENDED", "FAILED"];

interface QueryExecutor {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<{
    rows: T[];
  }>;
}

interface AuthorizedTaskRow extends QueryResultRow {
  task_id: string;
  task_status: string;
  room_id: string;
  customer_user_id: string;
  customer_full_name: string;
  customer_phone_number: string;
  agent_user_id: string;
  agent_full_name: string;
  agent_phone_number: string;
}

interface CallSessionRow extends QueryResultRow {
  id: string;
  task_id: string;
  room_id: string;
  initiated_by_user_id: string;
  initiated_by_full_name: string;
  initiated_by_phone_number: string;
  call_type: CallType;
  status: CallStatus;
  started_at: Date | string | null;
  accepted_at: Date | string | null;
  ended_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  history: unknown;
}

interface CallStatusHistoryRow extends QueryResultRow {
  id: string;
  actor_user_id: string;
  actor_role: string;
  from_status: CallStatus | null;
  to_status: CallStatus;
  note: string | null;
  signaling_event: string | null;
  created_at: Date | string;
}

@Injectable()
export class CallsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    @Optional() private readonly notifications?: NotificationsService
  ) {}

  async listCalls(taskId: string, user: AuthenticatedUser) {
    await this.getAuthorizedTask(taskId, user);

    const result = await this.database.query<CallSessionRow>(
      `${this.callSelect()}
       WHERE call.task_id = $1
       ORDER BY call.created_at DESC`,
      [taskId]
    );

    return result.rows.map((row) => this.mapCall(row));
  }

  async createCallSession(
    taskId: string,
    user: AuthenticatedUser,
    dto: CreateCallDto,
    context?: RequestContext
  ) {
    const callSession = await this.database.transaction(async (client) => {
      const task = await this.getAuthorizedTask(taskId, user, client);
      this.assertTaskCanStartCall(task);

      const callResult = await client.query<{ id: string }>(
        `INSERT INTO call_sessions (task_id, room_id, initiated_by_user_id, call_type, status)
         VALUES ($1, $2, $3, $4, 'REQUESTED')
         RETURNING id`,
        [task.task_id, task.room_id, user.id, dto.callType]
      );
      const call = callResult.rows[0];
      if (!call) {
        throw new BadRequestException("Call session could not be created");
      }

      await this.writeCallHistory(client, {
        taskId: task.task_id,
        callId: call.id,
        actor: user,
        fromStatus: null,
        toStatus: "REQUESTED",
        note: dto.note,
        signalingEvent: "call:request"
      });
      await this.transitionCall(client, task.task_id, call.id, user, "RINGING", {
        note: "Ringing task participant",
        signalingEvent: "call:ringing"
      });
      return {
        id: call.id,
        recipientUserId:
          user.id === task.customer_user_id ? task.agent_user_id : task.customer_user_id
      };
    });

    await this.audit.write({
      actorUserId: user.id,
      action: "CALL_SESSION_REQUESTED",
      entityType: "call_sessions",
      entityId: callSession.id,
      afterData: { taskId, callType: dto.callType },
      context
    });

    await this.notifications?.createNotification({
      recipientUserId: callSession.recipientUserId,
      actorUserId: user.id,
      type: "CALL_REQUESTED",
      title: `${dto.callType === "VIDEO" ? "Video" : "Audio"} call requested`,
      body: "A task participant requested a call.",
      relatedTaskId: taskId
    });

    return this.getCallForTask(taskId, callSession.id, user);
  }

  async acceptCall(taskId: string, callId: string, user: AuthenticatedUser, context?: RequestContext) {
    await this.transitionExistingCall(taskId, callId, user, "ACCEPTED", {
      signalingEvent: "call:accept",
      rejectInitiator: true
    });

    await this.audit.write({
      actorUserId: user.id,
      action: "CALL_SESSION_ACCEPTED",
      entityType: "call_sessions",
      entityId: callId,
      afterData: { taskId },
      context
    });

    return this.getCallForTask(taskId, callId, user);
  }

  async declineCall(taskId: string, callId: string, user: AuthenticatedUser, context?: RequestContext) {
    await this.transitionExistingCall(taskId, callId, user, "DECLINED", {
      signalingEvent: "call:decline",
      rejectInitiator: true
    });

    await this.audit.write({
      actorUserId: user.id,
      action: "CALL_SESSION_DECLINED",
      entityType: "call_sessions",
      entityId: callId,
      afterData: { taskId },
      context
    });

    return this.getCallForTask(taskId, callId, user);
  }

  async endCall(
    taskId: string,
    callId: string,
    user: AuthenticatedUser,
    dto: EndCallDto = {},
    context?: RequestContext
  ) {
    const status = dto.status ?? "ENDED";
    await this.transitionExistingCall(taskId, callId, user, status, {
      note: dto.note,
      signalingEvent: "call:end"
    });

    await this.audit.write({
      actorUserId: user.id,
      action: "CALL_SESSION_ENDED",
      entityType: "call_sessions",
      entityId: callId,
      afterData: { taskId, status },
      context
    });

    return this.getCallForTask(taskId, callId, user);
  }

  async getCallForTask(taskId: string, callId: string, user: AuthenticatedUser) {
    await this.getAuthorizedTask(taskId, user);
    const call = await this.loadCall(taskId, callId);
    if (!call) {
      throw new NotFoundException("Call session not found");
    }
    return this.mapCall(call);
  }

  async authorizeCallSignal(taskId: string, callId: string, user: AuthenticatedUser) {
    await this.getAuthorizedTask(taskId, user);
    const call = await this.loadCall(taskId, callId);
    if (!call) {
      throw new NotFoundException("Call session not found");
    }
    if (TERMINAL_CALL_STATUSES.includes(call.status)) {
      throw new ConflictException(`Cannot signal a ${call.status} call`);
    }

    return {
      call: this.mapCall(call),
      rtcConfiguration: this.rtcConfiguration()
    };
  }

  private async transitionExistingCall(
    taskId: string,
    callId: string,
    user: AuthenticatedUser,
    toStatus: CallStatus,
    options: { note?: string; signalingEvent?: string; rejectInitiator?: boolean } = {}
  ) {
    await this.database.transaction(async (client) => {
      await this.getAuthorizedTask(taskId, user, client);
      const call = await this.loadCallForUpdate(client, taskId, callId);
      if (!call) {
        throw new NotFoundException("Call session not found");
      }
      if (options.rejectInitiator && call.initiated_by_user_id === user.id) {
        throw new ForbiddenException("Call initiator cannot answer their own call");
      }
      await this.transitionCall(client, taskId, callId, user, toStatus, options, call);
    });
  }

  private async transitionCall(
    client: Pick<PoolClient, "query">,
    taskId: string,
    callId: string,
    actor: AuthenticatedUser,
    toStatus: CallStatus,
    options: { note?: string; signalingEvent?: string } = {},
    existingCall?: CallSessionRow
  ) {
    const call = existingCall ?? (await this.loadCallForUpdate(client, taskId, callId));
    if (!call) {
      throw new NotFoundException("Call session not found");
    }
    this.assertCallTransition(call.status, toStatus);

    await client.query(
	      `UPDATE call_sessions
	       SET
	         status = $3::call_status,
	         accepted_at = CASE WHEN $3::call_status = 'ACCEPTED'::call_status THEN NOW() ELSE accepted_at END,
	         started_at = CASE WHEN $3::call_status = 'ACCEPTED'::call_status THEN COALESCE(started_at, NOW()) ELSE started_at END,
	         ended_at = CASE WHEN $3::call_status IN (
	           'DECLINED'::call_status,
	           'MISSED'::call_status,
	           'ENDED'::call_status,
	           'FAILED'::call_status
	         ) THEN NOW() ELSE ended_at END,
	         updated_at = NOW()
	       WHERE task_id = $1 AND id = $2`,
	      [taskId, callId, toStatus]
	    );

    await this.writeCallHistory(client, {
      taskId,
      callId,
      actor,
      fromStatus: call.status,
      toStatus,
      note: options.note,
      signalingEvent: options.signalingEvent
    });
  }

  private assertCallTransition(fromStatus: CallStatus, toStatus: CallStatus) {
    const allowed: Record<CallStatus, CallStatus[]> = {
      REQUESTED: ["RINGING", "FAILED", "ENDED"],
      RINGING: ["ACCEPTED", "DECLINED", "MISSED", "FAILED", "ENDED"],
      ACCEPTED: ["ENDED", "FAILED"],
      DECLINED: [],
      MISSED: [],
      ENDED: [],
      FAILED: []
    };

    if (!allowed[fromStatus].includes(toStatus)) {
      throw new ConflictException(`Cannot move call from ${fromStatus} to ${toStatus}`);
    }
  }

  private async getAuthorizedTask(taskId: string, user: AuthenticatedUser, executor?: QueryExecutor) {
    const runner = executor ?? this.database;
    const result = await runner.query<AuthorizedTaskRow>(
      `SELECT
         task.id AS task_id,
         task.status::text AS task_status,
         room.id AS room_id,
         task.customer_user_id,
         customer_user.full_name AS customer_full_name,
         customer_user.phone_number AS customer_phone_number,
         task.assigned_agent_user_id AS agent_user_id,
         agent_user.full_name AS agent_full_name,
         agent_user.phone_number AS agent_phone_number
       FROM document_tasks task
       JOIN users customer_user ON customer_user.id = task.customer_user_id
       JOIN users agent_user ON agent_user.id = task.assigned_agent_user_id
       JOIN communication_rooms room ON room.task_id = task.id
       WHERE task.id = $1
         AND ($2::uuid = task.customer_user_id OR $2::uuid = task.assigned_agent_user_id)
       LIMIT 1`,
      [taskId, user.id]
    );

    const task = result.rows[0];
    if (!task) {
      throw new ForbiddenException("Only the task customer and assigned agent can access calls");
    }
    return task;
  }

  private assertTaskCanStartCall(task: AuthorizedTaskRow) {
    if (!ACTIVE_TASK_STATUSES.includes(task.task_status)) {
      throw new ConflictException(`Cannot start a call while task is ${task.task_status}`);
    }
  }

  private async loadCall(taskId: string, callId: string) {
    const result = await this.database.query<CallSessionRow>(
      `${this.callSelect()}
       WHERE call.task_id = $1 AND call.id = $2
       LIMIT 1`,
      [taskId, callId]
    );
    return result.rows[0] ?? null;
  }

  private async loadCallForUpdate(client: Pick<PoolClient, "query">, taskId: string, callId: string) {
    const result = await client.query<CallSessionRow>(
      `SELECT
         call.id,
         call.task_id,
         call.room_id,
         call.initiated_by_user_id,
         initiated_user.full_name AS initiated_by_full_name,
         initiated_user.phone_number AS initiated_by_phone_number,
         call.call_type::text AS call_type,
         call.status::text AS status,
         call.started_at,
         call.accepted_at,
         call.ended_at,
         call.created_at,
         call.updated_at,
         '[]'::jsonb AS history
       FROM call_sessions call
       JOIN users initiated_user ON initiated_user.id = call.initiated_by_user_id
       WHERE call.task_id = $1 AND call.id = $2
       FOR UPDATE`,
      [taskId, callId]
    );
    return result.rows[0] ?? null;
  }

  private async writeCallHistory(
    client: Pick<PoolClient, "query">,
    entry: {
      taskId: string;
      callId: string;
      actor: AuthenticatedUser;
      fromStatus: CallStatus | null;
      toStatus: CallStatus;
      note?: string;
      signalingEvent?: string;
    }
  ) {
    await client.query(
      `INSERT INTO call_status_history (
         call_session_id,
         task_id,
         actor_user_id,
         actor_role,
         from_status,
         to_status,
         note,
         signaling_event
       )
	       VALUES (
	         $1::uuid,
	         $2::uuid,
	         $3::uuid,
	         $4::user_role,
	         $5::call_status,
	         $6::call_status,
	         $7::text,
	         $8::text
	       )`,
      [
        entry.callId,
        entry.taskId,
        entry.actor.id,
        entry.actor.role,
        entry.fromStatus,
        entry.toStatus,
        this.cleanNote(entry.note),
        entry.signalingEvent ?? null
      ]
    );
  }

  private callSelect() {
    return `SELECT
        call.id,
        call.task_id,
        call.room_id,
        call.initiated_by_user_id,
        initiated_user.full_name AS initiated_by_full_name,
        initiated_user.phone_number AS initiated_by_phone_number,
        call.call_type::text AS call_type,
        call.status::text AS status,
        call.started_at,
        call.accepted_at,
        call.ended_at,
        call.created_at,
        call.updated_at,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', history.id,
                'actorUserId', history.actor_user_id,
                'actorRole', history.actor_role,
                'fromStatus', history.from_status,
                'toStatus', history.to_status,
                'note', history.note,
                'signalingEvent', history.signaling_event,
                'createdAt', history.created_at
              )
              ORDER BY history.created_at ASC, history.id ASC
            )
            FROM call_status_history history
            WHERE history.call_session_id = call.id
          ),
          '[]'::jsonb
        ) AS history
      FROM call_sessions call
      JOIN users initiated_user ON initiated_user.id = call.initiated_by_user_id`;
  }

  private mapCall(row: CallSessionRow) {
    return {
      id: row.id,
      taskId: row.task_id,
      roomId: row.room_id,
      callType: row.call_type,
      status: row.status,
      initiatedBy: {
        userId: row.initiated_by_user_id,
        fullName: row.initiated_by_full_name,
        phoneNumber: row.initiated_by_phone_number
      },
      rtcConfiguration: this.rtcConfiguration(),
      statusHistory: this.parseJsonArray(row.history).map((history) => this.mapHistory(history)),
      startedAt: this.dateOrNull(row.started_at),
      acceptedAt: this.dateOrNull(row.accepted_at),
      endedAt: this.dateOrNull(row.ended_at),
      createdAt: this.dateOrNull(row.created_at),
      updatedAt: this.dateOrNull(row.updated_at)
    };
  }

  private mapHistory(record: Record<string, unknown>) {
    return {
      id: String(record.id),
      actorUserId: String(record.actorUserId),
      actorRole: String(record.actorRole),
      fromStatus: record.fromStatus === null ? null : String(record.fromStatus),
      toStatus: String(record.toStatus),
      note: record.note === null ? null : String(record.note),
      signalingEvent: record.signalingEvent === null ? null : String(record.signalingEvent),
      createdAt: this.dateOrNull(String(record.createdAt))
    };
  }

  private rtcConfiguration() {
    return {
      iceServers: []
    };
  }

  private parseJsonArray(value: unknown): Array<Record<string, unknown>> {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
  }

  private cleanNote(note?: string) {
    const clean = note?.trim();
    return clean ? clean : null;
  }

  private dateOrNull(value: Date | string | null) {
    return value ? new Date(value).toISOString() : null;
  }
}
