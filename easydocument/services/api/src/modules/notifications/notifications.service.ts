import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { QueryResultRow } from "pg";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { writeStructuredLog } from "../../common/logging/structured-logger";
import { DatabaseService } from "../database/database.service";

export const NOTIFICATION_TYPES = [
  "OTP_SENT",
  "AGENT_VERIFICATION_APPROVED",
  "AGENT_VERIFICATION_REJECTED",
  "TASK_CREATED",
  "TASK_ACCEPTED",
  "DEAL_CONFIRMED",
  "TASK_STATUS_UPDATED",
  "MESSAGE_RECEIVED",
  "ATTACHMENT_RECEIVED",
  "CALL_REQUESTED",
  "CALL_MISSED",
  "DISPUTE_OPENED",
  "DISPUTE_STATUS_UPDATED",
  "DISPUTE_RESOLVED",
  "REVIEW_RECEIVED"
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationDeliveryChannel = "IN_APP" | "SMS_PLACEHOLDER" | "PUSH_PLACEHOLDER";

interface NotificationRow extends QueryResultRow {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  actor_full_name: string | null;
  type: NotificationType;
  delivery_channel: NotificationDeliveryChannel;
  title: string;
  body: string;
  related_task_id: string | null;
  related_dispute_id: string | null;
  related_review_id: string | null;
  read_at: Date | string | null;
  created_at: Date | string;
}

interface AdminSummaryRow extends QueryResultRow {
  total_notifications: string | number;
  unread_notifications: string | number;
}

interface TypeSummaryRow extends QueryResultRow {
  type: NotificationType;
  count: string | number;
  unread_count: string | number;
}

interface ChannelSummaryRow extends QueryResultRow {
  delivery_channel: NotificationDeliveryChannel;
  count: string | number;
}

export interface CreateNotificationInput {
  recipientUserId: string;
  actorUserId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  relatedTaskId?: string | null;
  relatedDisputeId?: string | null;
  relatedReviewId?: string | null;
  deliveryChannel?: NotificationDeliveryChannel;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly database: DatabaseService) {}

  async createNotification(input: CreateNotificationInput) {
    const result = await this.database.query<NotificationRow>(
      `${this.insertNotificationSql()}
       RETURNING
         id,
         recipient_user_id,
         actor_user_id,
         NULL::text AS actor_full_name,
         type::text AS type,
         delivery_channel::text AS delivery_channel,
         title,
         body,
         related_task_id,
         related_dispute_id,
         related_review_id,
         read_at,
         created_at`,
      this.notificationParams(input)
    );

    const notification = result.rows[0] ? this.mapNotification(result.rows[0]) : null;
    if (notification) {
      writeStructuredLog("info", "notification.created", {
        notificationId: notification.id,
        recipientUserId: notification.recipientUserId,
        actorUserId: input.actorUserId,
        type: input.type,
        deliveryChannel: input.deliveryChannel ?? "IN_APP",
        relatedTaskId: input.relatedTaskId,
        relatedDisputeId: input.relatedDisputeId,
        relatedReviewId: input.relatedReviewId
      });
    }
    return notification;
  }

  async createMany(inputs: CreateNotificationInput[]) {
    const results = [];
    for (const input of inputs) {
      const result = await this.createNotification(input);
      if (result) {
        results.push(result);
      }
    }
    return results;
  }

  async createForExistingPhoneNumber(
    phoneNumber: string,
    input: Omit<CreateNotificationInput, "recipientUserId">
  ) {
    const result = await this.database.query<{ id: string }>(
      `SELECT id
       FROM users
       WHERE phone_number = $1 AND status = 'ACTIVE'
       LIMIT 1`,
      [phoneNumber]
    );

    const user = result.rows[0];
    if (!user) {
      return null;
    }

    return this.createNotification({ ...input, recipientUserId: user.id });
  }

  async createForAdmins(input: Omit<CreateNotificationInput, "recipientUserId">) {
    const result = await this.database.query<{ id: string }>(
      `SELECT id
       FROM users
       WHERE role = 'ADMIN' AND status = 'ACTIVE'
       ORDER BY created_at ASC`
    );

    return this.createMany(result.rows.map((row) => ({ ...input, recipientUserId: row.id })));
  }

  async listForUser(user: AuthenticatedUser) {
    const result = await this.database.query<NotificationRow>(
      `${this.notificationSelect()}
       WHERE notification.recipient_user_id = $1
       ORDER BY notification.created_at DESC
       LIMIT 100`,
      [user.id]
    );

    return result.rows.map((row) => this.mapNotification(row));
  }

  async getUnreadCount(user: AuthenticatedUser) {
    const result = await this.database.query<{ count: string | number }>(
      `SELECT COUNT(*) AS count
       FROM notifications
       WHERE recipient_user_id = $1 AND read_at IS NULL`,
      [user.id]
    );

    return { unreadCount: Number(result.rows[0]?.count ?? 0) };
  }

  async markRead(user: AuthenticatedUser, notificationId: string) {
    const result = await this.database.query<NotificationRow>(
      `WITH updated AS (
         UPDATE notifications
         SET read_at = COALESCE(read_at, NOW())
         WHERE id = $1 AND recipient_user_id = $2
         RETURNING *
       )
       SELECT
         updated.id,
         updated.recipient_user_id,
         updated.actor_user_id,
         actor_user.full_name AS actor_full_name,
         updated.type::text AS type,
         updated.delivery_channel::text AS delivery_channel,
         updated.title,
         updated.body,
         updated.related_task_id,
         updated.related_dispute_id,
         updated.related_review_id,
         updated.read_at,
         updated.created_at
       FROM updated
       LEFT JOIN users actor_user ON actor_user.id = updated.actor_user_id`,
      [notificationId, user.id]
    );

    const notification = result.rows[0];
    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    return this.mapNotification(notification);
  }

  async markAllRead(user: AuthenticatedUser) {
    const result = await this.database.query<{ id: string }>(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, NOW())
       WHERE recipient_user_id = $1 AND read_at IS NULL
       RETURNING id`,
      [user.id]
    );

    return {
      markedReadCount: result.rows.length,
      readAt: result.rows.length ? new Date().toISOString() : null
    };
  }

  async getAdminSummary(admin: AuthenticatedUser) {
    if (admin.role !== "ADMIN") {
      throw new ForbiddenException("Only admins can view notification summaries");
    }

    const [countsResult, typeResult, channelResult] = await Promise.all([
      this.database.query<AdminSummaryRow>(
        `SELECT
           COUNT(*) AS total_notifications,
           COUNT(*) FILTER (WHERE notification.read_at IS NULL) AS unread_notifications
         FROM notifications notification
         JOIN users recipient ON recipient.id = notification.recipient_user_id
         WHERE recipient.role = 'ADMIN'`
      ),
      this.database.query<TypeSummaryRow>(
        `SELECT
           notification.type::text AS type,
           COUNT(*) AS count,
           COUNT(*) FILTER (WHERE notification.read_at IS NULL) AS unread_count
         FROM notifications notification
         JOIN users recipient ON recipient.id = notification.recipient_user_id
         WHERE recipient.role = 'ADMIN'
         GROUP BY notification.type
         ORDER BY notification.type`
      ),
      this.database.query<ChannelSummaryRow>(
        `SELECT
           notification.delivery_channel::text AS delivery_channel,
           COUNT(*) AS count
         FROM notifications notification
         JOIN users recipient ON recipient.id = notification.recipient_user_id
         WHERE recipient.role = 'ADMIN'
         GROUP BY notification.delivery_channel
         ORDER BY notification.delivery_channel`
      )
    ]);

    const counts = countsResult.rows[0];
    return {
      totalNotifications: Number(counts?.total_notifications ?? 0),
      unreadNotifications: Number(counts?.unread_notifications ?? 0),
      byType: typeResult.rows.map((row) => ({
        type: row.type,
        count: Number(row.count),
        unreadCount: Number(row.unread_count)
      })),
      byChannel: channelResult.rows.map((row) => ({
        deliveryChannel: row.delivery_channel,
        count: Number(row.count)
      }))
    };
  }

  private insertNotificationSql() {
    return `INSERT INTO notifications (
        recipient_user_id,
        actor_user_id,
        type,
        delivery_channel,
        title,
        body,
        related_task_id,
        related_dispute_id,
        related_review_id
      )
      VALUES ($1, $2, $3::notification_type, $4::notification_delivery_channel, $5, $6, $7, $8, $9)`;
  }

  private notificationParams(input: CreateNotificationInput) {
    return [
      input.recipientUserId,
      input.actorUserId ?? null,
      input.type,
      input.deliveryChannel ?? "IN_APP",
      input.title.trim(),
      input.body.trim(),
      input.relatedTaskId ?? null,
      input.relatedDisputeId ?? null,
      input.relatedReviewId ?? null
    ];
  }

  private notificationSelect() {
    return `SELECT
        notification.id,
        notification.recipient_user_id,
        notification.actor_user_id,
        actor_user.full_name AS actor_full_name,
        notification.type::text AS type,
        notification.delivery_channel::text AS delivery_channel,
        notification.title,
        notification.body,
        notification.related_task_id,
        notification.related_dispute_id,
        notification.related_review_id,
        notification.read_at,
        notification.created_at
      FROM notifications notification
      LEFT JOIN users actor_user ON actor_user.id = notification.actor_user_id`;
  }

  private mapNotification(row: NotificationRow) {
    return {
      id: row.id,
      recipientUserId: row.recipient_user_id,
      actor:
        row.actor_user_id === null
          ? null
          : {
              userId: row.actor_user_id,
              fullName: row.actor_full_name
            },
      type: row.type,
      deliveryChannel: row.delivery_channel,
      title: row.title,
      body: row.body,
      relatedTaskId: row.related_task_id,
      relatedDisputeId: row.related_dispute_id,
      relatedReviewId: row.related_review_id,
      readAt: this.dateOrNull(row.read_at),
      createdAt: this.dateOrNull(row.created_at)
    };
  }

  private dateOrNull(value: Date | string | null) {
    return value ? new Date(value).toISOString() : null;
  }
}
