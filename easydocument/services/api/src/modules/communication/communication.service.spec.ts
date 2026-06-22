import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";
import { StorageService } from "../storage/storage.service";
import { CommunicationService } from "./communication.service";

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

const unrelatedAgentUser = {
  id: "33333333-3333-3333-3333-333333333333",
  phoneNumber: "+9779800000003",
  role: "AGENT" as const
};

function roomRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    task_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    task_name: "SITA CUSTOMER-CITIZENSHIP-CDAO",
    customer_user_id: customerUser.id,
    customer_full_name: "Sita Customer",
    customer_phone_number: customerUser.phoneNumber,
    agent_user_id: agentUser.id,
    agent_full_name: "Hari Agent",
    agent_phone_number: agentUser.phoneNumber,
    created_at: "2026-06-22T00:00:00.000Z",
    updated_at: "2026-06-22T00:00:00.000Z",
    ...overrides
  };
}

function messageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    room_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    task_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    sender_user_id: customerUser.id,
    sender_full_name: "Sita Customer",
    body: "Can you confirm the appointment time?",
    message_type: "TEXT",
    attachments: [],
    read_by: [
      {
        userId: customerUser.id,
        readAt: "2026-06-22T00:01:00.000Z"
      }
    ],
    created_at: "2026-06-22T00:01:00.000Z",
    ...overrides
  };
}

function attachmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    room_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    uploaded_by_user_id: customerUser.id,
    file_metadata_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    attachment_type: "DOCUMENT",
    object_key: "local/chat/task/customer/DOCUMENT/generated.pdf",
    original_filename: "supporting.pdf",
    mime_type: "application/pdf",
    size_bytes: 2048,
    status: "PLACEHOLDER",
    created_at: "2026-06-22T00:02:00.000Z",
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
  const storage = {
    buildCommunicationAttachmentPlaceholderKey: jest.fn(() => "local/chat/generated.pdf")
  };
  const audit = {
    write: jest.fn()
  };

  const service = new CommunicationService(
    database as unknown as DatabaseService,
    storage as unknown as StorageService,
    audit as unknown as AuditService
  );

  return { audit, database, query, service, storage };
}

describe("CommunicationService", () => {
  it("creates exactly one room for an accepted task", async () => {
    const { service } = createService();
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [roomRow()] })
    };

    const room = await service.ensureRoomForAcceptedTask(
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      client
    );

    expect(client.query.mock.calls[0][0]).toContain("ON CONFLICT (task_id) DO NOTHING");
    expect(room.id).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    expect(room.participants.customer.userId).toBe(customerUser.id);
    expect(room.participants.agent.userId).toBe(agentUser.id);
  });

  it("lists room messages for a task participant", async () => {
    const { query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [roomRow()] })
      .mockResolvedValueOnce({ rows: [messageRow()] });

    const messages = await service.listMessages("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", agentUser);

    expect(messages).toEqual([
      expect.objectContaining({
        id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
        body: "Can you confirm the appointment time?",
        readBy: [expect.objectContaining({ userId: customerUser.id })]
      })
    ]);
  });

  it("stores a text message and optional room attachment links", async () => {
    const { audit, query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [roomRow()] })
      .mockResolvedValueOnce({ rows: [{ id: "cccccccc-cccc-cccc-cccc-cccccccccccc" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "dddddddd-dddd-dddd-dddd-dddddddddddd" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          messageRow({
            attachments: [
              {
                id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
                attachmentType: "DOCUMENT",
                fileId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
                objectKey: "local/chat/generated.pdf",
                originalFilename: "supporting.pdf",
                mimeType: "application/pdf",
                sizeBytes: 2048,
                status: "PLACEHOLDER"
              }
            ]
          })
        ]
      });

    const message = await service.sendMessage(
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      customerUser,
      {
        body: " Can you confirm the appointment time? ",
        attachmentIds: ["dddddddd-dddd-dddd-dddd-dddddddddddd"]
      },
      {}
    );

    expect(message.body).toBe("Can you confirm the appointment time?");
    expect(message.attachments).toEqual([
      expect.objectContaining({ id: "dddddddd-dddd-dddd-dddd-dddddddddddd" })
    ]);
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CHAT_MESSAGE_CREATED" })
    );
  });

  it("blocks unrelated users from a room", async () => {
    const { query, service } = createService();
    query.mockResolvedValueOnce({ rows: [] });

    await expect(
      service.getRoomForTask("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", unrelatedAgentUser)
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects attachments that do not belong to the room", async () => {
    const { query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [roomRow()] })
      .mockResolvedValueOnce({ rows: [{ id: "cccccccc-cccc-cccc-cccc-cccccccccccc" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      service.sendMessage("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", customerUser, {
        body: "Here is the file",
        attachmentIds: ["dddddddd-dddd-dddd-dddd-dddddddddddd"]
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates attachment metadata with a MinIO placeholder object key", async () => {
    const { audit, query, service, storage } = createService();
    query
      .mockResolvedValueOnce({ rows: [roomRow()] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
            object_key: "local/chat/generated.pdf",
            original_filename: "supporting.pdf",
            mime_type: "application/pdf",
            size_bytes: 2048,
            status: "PLACEHOLDER"
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          attachmentRow({
            object_key: "local/chat/generated.pdf"
          })
        ]
      });

    const attachment = await service.createAttachmentPlaceholder(
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      customerUser,
      {
        attachmentType: "DOCUMENT",
        mimeType: "application/pdf",
        sizeBytes: 2048,
        originalFilename: "supporting.pdf"
      },
      {}
    );

    expect(storage.buildCommunicationAttachmentPlaceholderKey).toHaveBeenCalledWith(
      customerUser.id,
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      "DOCUMENT",
      "pdf"
    );
    expect(attachment).toEqual(
      expect.objectContaining({
        uploadMode: "placeholder",
        attachmentType: "DOCUMENT",
        objectKey: "local/chat/generated.pdf"
      })
    );
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CHAT_ATTACHMENT_PLACEHOLDER_CREATED" })
    );
  });

  it("marks unread messages as read for the other participant", async () => {
    const { query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [roomRow()] })
      .mockResolvedValueOnce({
        rows: [
          {
            message_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
            read_at: "2026-06-22T00:03:00.000Z"
          }
        ]
      });

    const result = await service.markMessagesRead("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", agentUser);

    expect(result).toEqual(
      expect.objectContaining({
        readerUserId: agentUser.id,
        messageIds: ["cccccccc-cccc-cccc-cccc-cccccccccccc"]
      })
    );
  });
});
