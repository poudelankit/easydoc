import { ConflictException, ForbiddenException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";
import { NotificationsService } from "../notifications/notifications.service";
import { DisputesService } from "./disputes.service";

const taskId = "11111111-1111-1111-1111-111111111111";
const roomId = "22222222-2222-2222-2222-222222222222";
const disputeId = "33333333-3333-3333-3333-333333333333";

const customerUser = {
  id: "44444444-4444-4444-4444-444444444444",
  phoneNumber: "+9779800000000",
  role: "CUSTOMER" as const
};

const agentUser = {
  id: "55555555-5555-5555-5555-555555555555",
  phoneNumber: "+9779700000000",
  role: "AGENT" as const
};

const adminUser = {
  id: "66666666-6666-6666-6666-666666666666",
  phoneNumber: "+9779800000001",
  role: "ADMIN" as const
};

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: taskId,
    task_name: "CUSTOMER-PASSPORT-ORG",
    status: "ACCEPTED",
    customer_user_id: customerUser.id,
    customer_full_name: "Customer One",
    customer_phone_number: customerUser.phoneNumber,
    assigned_agent_user_id: agentUser.id,
    agent_full_name: "Agent One",
    agent_phone_number: agentUser.phoneNumber,
    room_id: roomId,
    ...overrides
  };
}

function disputeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: disputeId,
    task_id: taskId,
    task_name: "CUSTOMER-PASSPORT-ORG",
    task_status: "ACCEPTED",
    customer_user_id: customerUser.id,
    customer_full_name: "Customer One",
    customer_phone_number: customerUser.phoneNumber,
    agent_user_id: agentUser.id,
    agent_full_name: "Agent One",
    agent_phone_number: agentUser.phoneNumber,
    room_id: roomId,
    reason: "Delay",
    description: "The document visit has been delayed.",
    opened_by_user_id: customerUser.id,
    opened_by_full_name: "Customer One",
    opened_by_phone_number: customerUser.phoneNumber,
    opened_by_role: "CUSTOMER",
    status: "OPEN",
    resolution_summary: null,
    resolved_by_admin_user_id: null,
    resolved_by_admin_full_name: null,
    resolved_at: null,
    created_at: "2026-06-22T00:00:00.000Z",
    updated_at: "2026-06-22T00:00:00.000Z",
    ...overrides
  };
}

function createService() {
  const query = jest.fn();
  const database = {
    query,
    transaction: jest.fn(async (callback: (client: { query: typeof query }) => Promise<unknown>) =>
      callback({ query })
    )
  };
  const audit = {
    write: jest.fn()
  };
  const notifications = {
    createNotification: jest.fn(),
    createForAdmins: jest.fn(),
    createMany: jest.fn()
  };
  const service = new DisputesService(
    database as unknown as DatabaseService,
    audit as unknown as AuditService,
    notifications as unknown as NotificationsService
  );

  return { audit, database, notifications, query, service };
}

describe("DisputesService", () => {
  it("lets the task customer open a dispute for an assigned active task", async () => {
    const { audit, notifications, query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [taskRow()] })
      .mockResolvedValueOnce({ rows: [{ id: disputeId }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [disputeRow()] })
      .mockResolvedValueOnce({ rows: [disputeRow()] });

    const dispute = await service.createTaskDispute(
      taskId,
      customerUser,
      {
        reason: "Delay",
        description: "The document visit has been delayed."
      },
      {}
    );

    expect(dispute.status).toBe("OPEN");
    expect(dispute.reason).toBe("Delay");
    expect(query.mock.calls[1][1]).toEqual([
      taskId,
      customerUser.id,
      agentUser.id,
      roomId,
      "Delay",
      "The document visit has been delayed.",
      customerUser.id,
      "CUSTOMER"
    ]);
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TASK_DISPUTE_OPENED" })
    );
    expect(notifications.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: agentUser.id,
        actorUserId: customerUser.id,
        type: "DISPUTE_OPENED",
        relatedTaskId: taskId,
        relatedDisputeId: disputeId
      })
    );
    expect(notifications.createForAdmins).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: customerUser.id,
        type: "DISPUTE_OPENED",
        relatedDisputeId: disputeId
      })
    );
  });

  it("blocks disputes for completed tasks", async () => {
    const { query, service } = createService();
    query.mockResolvedValueOnce({ rows: [taskRow({ status: "COMPLETED" })] });

    await expect(
      service.createTaskDispute(
        taskId,
        customerUser,
        { reason: "Late", description: "This should not open." },
        {}
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("blocks unrelated participants from viewing a dispute", async () => {
    const { query, service } = createService();
    query.mockResolvedValueOnce({ rows: [disputeRow()] });

    await expect(
      service.getParticipantDispute(disputeId, {
        id: "77777777-7777-7777-7777-777777777777",
        phoneNumber: "+9779800000002",
        role: "CUSTOMER"
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("adds admin mediation notes without exposing them to participant responses", async () => {
    const { audit, query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [disputeRow()] })
      .mockResolvedValueOnce({ rows: [{ id: "88888888-8888-8888-8888-888888888888" }] })
      .mockResolvedValueOnce({ rows: [disputeRow()] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "88888888-8888-8888-8888-888888888888",
            admin_user_id: adminUser.id,
            admin_full_name: "Local Admin",
            note: "Internal mediation note",
            created_at: "2026-06-22T00:01:00.000Z"
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: taskId,
            room_id: roomId,
            room_created_at: "2026-06-22T00:00:00.000Z",
            message_count: 0,
            attachment_count: 0,
            call_count: 0,
            last_activity_at: "2026-06-22T00:00:00.000Z"
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [disputeRow()] });

    const adminDetail = await service.addMediationNote(
      disputeId,
      adminUser,
      { note: "Internal mediation note" },
      {}
    );
    const participantDetail = await service.getParticipantDispute(disputeId, customerUser);

    expect(adminDetail.mediationNotes[0].note).toBe("Internal mediation note");
    expect(JSON.stringify(participantDetail)).not.toContain("Internal mediation note");
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: "DISPUTE_MEDIATION_NOTE_ADDED" })
    );
  });

  it("updates dispute status and writes history", async () => {
    const { audit, notifications, query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [disputeRow()] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [disputeRow({ status: "UNDER_REVIEW" })] })
      .mockResolvedValueOnce({ rows: [disputeRow({ status: "UNDER_REVIEW" })] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const dispute = await service.updateDisputeStatus(
      disputeId,
      adminUser,
      { status: "UNDER_REVIEW", note: "Review started" },
      {}
    );

    expect(dispute.status).toBe("UNDER_REVIEW");
    expect(query.mock.calls[1][1]).toEqual([disputeId, "UNDER_REVIEW"]);
    expect(query.mock.calls[2][1]).toEqual([
      disputeId,
      adminUser.id,
      "ADMIN",
      "OPEN",
      "UNDER_REVIEW",
      "Review started"
    ]);
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: "DISPUTE_STATUS_UPDATED" })
    );
    expect(notifications.createMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          recipientUserId: customerUser.id,
          actorUserId: adminUser.id,
          type: "DISPUTE_STATUS_UPDATED",
          relatedDisputeId: disputeId
        }),
        expect.objectContaining({
          recipientUserId: agentUser.id,
          actorUserId: adminUser.id,
          type: "DISPUTE_STATUS_UPDATED",
          relatedDisputeId: disputeId
        })
      ])
    );
  });

  it("resolves a dispute with a participant-visible summary", async () => {
    const { query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [disputeRow({ status: "UNDER_REVIEW" })] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [disputeRow({ status: "RESOLVED", resolution_summary: "Agent will revisit tomorrow." })]
      })
      .mockResolvedValueOnce({
        rows: [disputeRow({ status: "RESOLVED", resolution_summary: "Agent will revisit tomorrow." })]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const dispute = await service.resolveDispute(
      disputeId,
      adminUser,
      { resolutionSummary: "Agent will revisit tomorrow." },
      {}
    );

    expect(dispute.status).toBe("RESOLVED");
    expect(dispute.resolutionSummary).toBe("Agent will revisit tomorrow.");
  });
});
