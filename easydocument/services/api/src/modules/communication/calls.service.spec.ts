import { ConflictException, ForbiddenException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";
import { CallsService } from "./calls.service";

const taskId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const roomId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const callId = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const customerUser = {
  id: "11111111-1111-1111-1111-111111111111",
  phoneNumber: "+9779800000000",
  role: "CUSTOMER" as const
};

const agentUser = {
  id: "22222222-2222-2222-2222-222222222222",
  phoneNumber: "+9779800000002",
  role: "AGENT" as const
};

function authorizedTaskRow(overrides: Record<string, unknown> = {}) {
  return {
    task_id: taskId,
    task_status: "DEAL_CONFIRMED",
    room_id: roomId,
    customer_user_id: customerUser.id,
    customer_full_name: "Sita Customer",
    customer_phone_number: customerUser.phoneNumber,
    agent_user_id: agentUser.id,
    agent_full_name: "Hari Agent",
    agent_phone_number: agentUser.phoneNumber,
    ...overrides
  };
}

function callRow(overrides: Record<string, unknown> = {}) {
  return {
    id: callId,
    task_id: taskId,
    room_id: roomId,
    initiated_by_user_id: customerUser.id,
    initiated_by_full_name: "Sita Customer",
    initiated_by_phone_number: customerUser.phoneNumber,
    call_type: "AUDIO",
    status: "RINGING",
    started_at: null,
    accepted_at: null,
    ended_at: null,
    created_at: "2026-06-22T00:00:00.000Z",
    updated_at: "2026-06-22T00:00:00.000Z",
    history: [
      {
        id: "history-1",
        actorUserId: customerUser.id,
        actorRole: "CUSTOMER",
        fromStatus: null,
        toStatus: "REQUESTED",
        note: "Please call me",
        signalingEvent: "call:request",
        createdAt: "2026-06-22T00:00:00.000Z"
      },
      {
        id: "history-2",
        actorUserId: customerUser.id,
        actorRole: "CUSTOMER",
        fromStatus: "REQUESTED",
        toStatus: "RINGING",
        note: "Ringing task participant",
        signalingEvent: "call:ringing",
        createdAt: "2026-06-22T00:00:01.000Z"
      }
    ],
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
  const service = new CallsService(
    database as unknown as DatabaseService,
    audit as unknown as AuditService
  );

  return { audit, database, query, service };
}

describe("CallsService", () => {
  it("creates a ringing audio call session with status history", async () => {
    const { audit, query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [authorizedTaskRow()] })
      .mockResolvedValueOnce({ rows: [{ id: callId }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [callRow({ status: "REQUESTED", history: [] })] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [authorizedTaskRow()] })
      .mockResolvedValueOnce({ rows: [callRow()] });

    const call = await service.createCallSession(
      taskId,
      customerUser,
      { callType: "AUDIO", note: "Please call me" },
      {}
    );

    expect(call.status).toBe("RINGING");
    expect(call.callType).toBe("AUDIO");
    expect(call.rtcConfiguration).toEqual({ iceServers: [] });
    expect(call.statusHistory.map((entry) => entry.toStatus)).toEqual(["REQUESTED", "RINGING"]);
    expect(query.mock.calls[4][0]).toContain("$3::call_status");
    expect(query.mock.calls[5][0]).toContain("$5::call_status");
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CALL_SESSION_REQUESTED" })
    );
  });

  it("blocks unrelated users from call access", async () => {
    const { query, service } = createService();
    query.mockResolvedValueOnce({ rows: [] });

    await expect(service.listCalls(taskId, agentUser)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("lets the receiving participant accept a ringing call", async () => {
    const { audit, query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [authorizedTaskRow()] })
      .mockResolvedValueOnce({ rows: [callRow({ status: "RINGING" })] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [authorizedTaskRow()] })
      .mockResolvedValueOnce({ rows: [callRow({ status: "ACCEPTED" })] });

    const call = await service.acceptCall(taskId, callId, agentUser, {});

    expect(call.status).toBe("ACCEPTED");
    expect(query.mock.calls[2][0]).toContain("$3::call_status");
    expect(query.mock.calls[2][1]).toEqual([taskId, callId, "ACCEPTED"]);
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CALL_SESSION_ACCEPTED" })
    );
  });

  it("rejects invalid call status transitions", async () => {
    const { query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [authorizedTaskRow()] })
      .mockResolvedValueOnce({ rows: [callRow({ status: "ENDED" })] });

    await expect(service.acceptCall(taskId, callId, agentUser, {})).rejects.toBeInstanceOf(
      ConflictException
    );
  });

  it("ends an accepted call and stores the terminal status", async () => {
    const { query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [authorizedTaskRow()] })
      .mockResolvedValueOnce({ rows: [callRow({ status: "ACCEPTED" })] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [authorizedTaskRow()] })
      .mockResolvedValueOnce({ rows: [callRow({ status: "ENDED" })] });

    const call = await service.endCall(taskId, callId, customerUser, { note: "Done" }, {});

    expect(call.status).toBe("ENDED");
    expect(query.mock.calls[2][0]).toContain("$3::call_status");
    expect(query.mock.calls[2][1]).toEqual([taskId, callId, "ENDED"]);
  });
});
