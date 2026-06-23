import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { NotificationsService } from "./notifications.service";

const customerUser = {
  id: "11111111-1111-1111-1111-111111111111",
  phoneNumber: "+9779800000000",
  role: "CUSTOMER" as const
};

const adminUser = {
  id: "22222222-2222-2222-2222-222222222222",
  phoneNumber: "+9779800000001",
  role: "ADMIN" as const
};

const notificationId = "33333333-3333-3333-3333-333333333333";
const taskId = "44444444-4444-4444-4444-444444444444";

function notificationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: notificationId,
    recipient_user_id: customerUser.id,
    actor_user_id: adminUser.id,
    actor_full_name: "Local Admin",
    type: "TASK_ACCEPTED",
    delivery_channel: "IN_APP",
    title: "Task accepted",
    body: "An agent accepted your task.",
    related_task_id: taskId,
    related_dispute_id: null,
    related_review_id: null,
    read_at: null,
    created_at: "2026-06-23T00:00:00.000Z",
    ...overrides
  };
}

function createService() {
  const query = jest.fn();
  const database = { query };
  const service = new NotificationsService(database as unknown as DatabaseService);
  return { query, service };
}

describe("NotificationsService", () => {
  it("creates and lists in-app notifications for the recipient", async () => {
    const { query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [notificationRow()] })
      .mockResolvedValueOnce({ rows: [notificationRow()] });

    const created = await service.createNotification({
      recipientUserId: customerUser.id,
      actorUserId: adminUser.id,
      type: "TASK_ACCEPTED",
      title: "Task accepted",
      body: "An agent accepted your task.",
      relatedTaskId: taskId
    });
    const list = await service.listForUser(customerUser);

    expect(created?.type).toBe("TASK_ACCEPTED");
    expect(created?.deliveryChannel).toBe("IN_APP");
    expect(query.mock.calls[0][1]).toEqual([
      customerUser.id,
      adminUser.id,
      "TASK_ACCEPTED",
      "IN_APP",
      "Task accepted",
      "An agent accepted your task.",
      taskId,
      null,
      null
    ]);
    expect(list[0].id).toBe(notificationId);
  });

  it("returns unread count and marks one notification read", async () => {
    const { query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [{ count: 2 }] })
      .mockResolvedValueOnce({
        rows: [notificationRow({ read_at: "2026-06-23T00:01:00.000Z" })]
      });

    await expect(service.getUnreadCount(customerUser)).resolves.toEqual({ unreadCount: 2 });
    const notification = await service.markRead(customerUser, notificationId);

    expect(notification.readAt).toBe("2026-06-23T00:01:00.000Z");
    expect(query.mock.calls[1][1]).toEqual([notificationId, customerUser.id]);
  });

  it("returns not found when a user marks another user's notification", async () => {
    const { query, service } = createService();
    query.mockResolvedValueOnce({ rows: [] });

    await expect(service.markRead(customerUser, notificationId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("marks all unread notifications for a user", async () => {
    const { query, service } = createService();
    query.mockResolvedValueOnce({ rows: [{ id: "a" }, { id: "b" }] });

    const result = await service.markAllRead(customerUser);

    expect(result.markedReadCount).toBe(2);
    expect(result.readAt).toEqual(expect.any(String));
  });

  it("returns admin notification summary", async () => {
    const { query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [{ total_notifications: 4, unread_notifications: 3 }] })
      .mockResolvedValueOnce({
        rows: [{ type: "DISPUTE_OPENED", count: 2, unread_count: 1 }]
      })
      .mockResolvedValueOnce({ rows: [{ delivery_channel: "IN_APP", count: 4 }] });

    const summary = await service.getAdminSummary(adminUser);

    expect(summary.totalNotifications).toBe(4);
    expect(summary.unreadNotifications).toBe(3);
    expect(summary.byType[0]).toEqual({
      type: "DISPUTE_OPENED",
      count: 2,
      unreadCount: 1
    });
  });

  it("blocks non-admin users from admin notification summaries", async () => {
    const { service } = createService();

    await expect(service.getAdminSummary(customerUser)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
