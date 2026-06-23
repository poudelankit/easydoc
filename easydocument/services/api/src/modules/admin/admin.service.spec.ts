import { BadRequestException } from "@nestjs/common";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

const adminUser = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  phoneNumber: "+9779800000001",
  role: "ADMIN" as const
};

const agentId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const taskId = "cccccccc-cccc-cccc-cccc-cccccccccccc";

function agentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: agentId,
    user_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    full_name: "Agent One",
    phone_number: "+9779700000001",
    address_text: "Lalitpur",
    citizenship_number: "CTZ-001",
    permanent_address_text: "Lalitpur",
    permanent_latitude: 27.671,
    permanent_longitude: 85.324,
    status: "PENDING_VERIFICATION",
    verification_notes: null,
    verification_decision: null,
    verification_decided_by_user_id: null,
    verification_decided_by_full_name: null,
    verification_decided_at: null,
    verification_rejection_reason: null,
    is_available: true,
    created_at: "2026-06-22T00:00:00.000Z",
    updated_at: "2026-06-22T00:00:00.000Z",
    citizenship_files: [
      {
        fileId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
        kind: "CITIZENSHIP_FRONT",
        objectKey: "kyc/front.jpg",
        originalFilename: "front.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        status: "PLACEHOLDER",
        createdAt: "2026-06-22T00:00:00.000Z"
      }
    ],
    ...overrides
  };
}

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: taskId,
    customer_user_id: "11111111-1111-1111-1111-111111111111",
    customer_full_name: "Customer One",
    customer_phone_number: "+9779800000000",
    assigned_agent_user_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    assigned_agent_full_name: "Agent One",
    assigned_agent_phone_number: "+9779700000001",
    task_name: "CUSTOMER-PASSPORT-ORG",
    document_type: "Passport",
    organization_name: "Org",
    organization_address: "Kathmandu",
    organization_latitude: 27.7,
    organization_longitude: 85.3,
    request_description: "Please help",
    status: "ACCEPTED",
    accepted_at: "2026-06-22T00:00:00.000Z",
    expected_completion_date: "2026-06-30",
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
    createNotification: jest.fn()
  };
  const service = new AdminService(
    database as unknown as DatabaseService,
    audit as unknown as AuditService,
    notifications as unknown as NotificationsService
  );

  return { audit, database, notifications, query, service };
}

describe("AdminService", () => {
  it("keeps admin endpoints restricted to ADMIN role metadata", () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminController)).toEqual(["ADMIN"]);
  });

  it("approves an agent and stores admin verification metadata", async () => {
    const { audit, notifications, query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [{ id: agentId }] })
      .mockResolvedValueOnce({ rows: [agentRow()] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          agentRow({
            status: "VERIFIED",
            verification_decision: "APPROVED",
            verification_decided_by_user_id: adminUser.id,
            verification_decided_by_full_name: "Local Admin",
            verification_decided_at: "2026-06-22T00:01:00.000Z"
          })
        ]
      });

    const result = await service.approveAgent(agentId, adminUser, {});

    expect(result.status).toBe("VERIFIED");
    expect(result.verification.decision).toBe("APPROVED");
    expect(query.mock.calls[2][0]).toContain("verification_decided_by_user_id");
    expect(query.mock.calls[2][1]).toEqual([agentId, adminUser.id]);
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: "AGENT_VERIFICATION_APPROVED" })
    );
    expect(notifications.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        actorUserId: adminUser.id,
        type: "AGENT_VERIFICATION_APPROVED"
      })
    );
  });

  it("rejects an agent and stores reason plus admin actor", async () => {
    const { audit, notifications, query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [{ id: agentId }] })
      .mockResolvedValueOnce({ rows: [agentRow()] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          agentRow({
            status: "REJECTED",
            verification_decision: "REJECTED",
            verification_decided_by_user_id: adminUser.id,
            verification_decided_by_full_name: "Local Admin",
            verification_decided_at: "2026-06-22T00:01:00.000Z",
            verification_rejection_reason: "Citizenship image is unreadable"
          })
        ]
      });

    const result = await service.rejectAgent(
      agentId,
      adminUser,
      { reason: "Citizenship image is unreadable" },
      {}
    );

    expect(result.status).toBe("REJECTED");
    expect(result.verification.reason).toBe("Citizenship image is unreadable");
    expect(query.mock.calls[2][1]).toEqual([
      agentId,
      "Citizenship image is unreadable",
      adminUser.id
    ]);
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: "AGENT_VERIFICATION_REJECTED" })
    );
    expect(notifications.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        actorUserId: adminUser.id,
        type: "AGENT_VERIFICATION_REJECTED"
      })
    );
  });

  it("lists tasks by status and rejects unsupported filters", async () => {
    const { query, service } = createService();
    query.mockResolvedValueOnce({ rows: [taskRow()] });

    const tasks = await service.listTasks("accepted");

    expect(tasks[0].status).toBe("ACCEPTED");
    expect(query.mock.calls[0][1]).toEqual(["ACCEPTED"]);
    await expect(service.listTasks("PAYMENT_PENDING")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns communication audit metadata without raw message bodies", async () => {
    const { query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [taskRow()] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: taskId,
            room_id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
            room_created_at: "2026-06-22T00:00:00.000Z",
            message_count: 2,
            attachment_count: 1,
            call_count: 3,
            last_activity_at: "2026-06-22T00:10:00.000Z"
          }
        ]
      });

    const audit = await service.getCommunicationAudit(taskId);

    expect(audit.roomExists).toBe(true);
    expect(audit.messageCount).toBe(2);
    expect(audit.attachmentCount).toBe(1);
    expect(audit.callCount).toBe(3);
    expect(audit.rawMessageBodyVisible).toBe(false);
    expect(JSON.stringify(audit)).not.toContain("Please help");
  });
});
