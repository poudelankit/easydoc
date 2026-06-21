import { ConflictException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";
import { StorageService } from "../storage/storage.service";
import { UsersService } from "../users/users.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { TasksService } from "./tasks.service";

const customerUser = {
  id: "customer-user-id",
  phoneNumber: "+9779800000000",
  role: "CUSTOMER" as const
};

const agentUser = {
  id: "agent-user-id",
  phoneNumber: "+9779800000002",
  role: "AGENT" as const
};

function createMocks() {
  const query = jest.fn();
  const database = {
    query,
    transaction: jest.fn(async (callback: (client: { query: typeof query }) => Promise<unknown>) =>
      callback({ query })
    )
  };
  const users = {
    getProfile: jest.fn()
  };
  const storage = {
    buildTaskSupportingPlaceholderKey: jest.fn(
      (_userId: string, taskId: string, extension: string) =>
        `local/tasks/customer-user-id/${taskId}/supporting/generated.${extension}`
    )
  };
  const audit = {
    write: jest.fn()
  };

  const service = new TasksService(
    database as unknown as DatabaseService,
    users as unknown as UsersService,
    storage as unknown as StorageService,
    audit as unknown as AuditService
  );

  return { audit, database, query, service, storage, users };
}

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-id",
    customer_user_id: customerUser.id,
    assigned_agent_user_id: null,
    task_name: "SITA CUSTOMER-CITIZENSHIP-CDAO",
    document_type: "Citizenship",
    organization_name: "CDAO",
    organization_address: "Babarmahal, Kathmandu",
    organization_latitude: 27.7001,
    organization_longitude: 85.3221,
    request_description: "Please collect and verify my document.",
    status: "CREATED",
    accepted_at: null,
    created_at: "2026-06-21T00:00:00.000Z",
    updated_at: "2026-06-21T00:00:00.000Z",
    customer_full_name: "Sita Customer",
    customer_phone_number: customerUser.phoneNumber,
    customer_address_text: "Kathmandu",
    assigned_agent_full_name: null,
    assigned_agent_phone_number: null,
    assigned_agent_profile_id: null,
    assigned_agent_status: null,
    assigned_agent_permanent_latitude: null,
    assigned_agent_permanent_longitude: null,
    supporting_documents: [],
    distance_meters: null,
    ...overrides
  };
}

function agentLocationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "agent-profile-id",
    status: "PENDING_VERIFICATION",
    is_available: true,
    permanent_latitude: 27.7002,
    permanent_longitude: 85.3222,
    ...overrides
  };
}

describe("TasksService", () => {
  it("creates a task with the required generated name and supporting placeholders", async () => {
    const { audit, query, service, users } = createMocks();
    users.getProfile.mockResolvedValue({
      id: customerUser.id,
      phoneNumber: customerUser.phoneNumber,
      fullName: "Sita Customer",
      addressText: "Kathmandu",
      role: "CUSTOMER",
      status: "ACTIVE",
      profilePhotoUrl: null
    });

    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "task-id",
            task_name: "SITA CUSTOMER-CITIZENSHIP-CDAO",
            status: "CREATED"
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "file-id",
            object_key: "local/tasks/customer-user-id/task-id/supporting/generated.pdf",
            original_filename: "citizenship.pdf",
            mime_type: "application/pdf",
            size_bytes: 2048,
            status: "PLACEHOLDER"
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          taskRow({
            supporting_documents: [
              {
                fileId: "file-id",
                objectKey: "local/tasks/customer-user-id/task-id/supporting/generated.pdf",
                originalFilename: "citizenship.pdf",
                mimeType: "application/pdf",
                sizeBytes: 2048,
                status: "PLACEHOLDER"
              }
            ]
          })
        ]
      });

    const dto: CreateTaskDto = {
      documentType: "Citizenship",
      organizationName: "CDAO",
      organizationAddress: "Babarmahal, Kathmandu",
      organizationLatitude: 27.7001,
      organizationLongitude: 85.3221,
      requestDescription: "Please collect and verify my document.",
      supportingDocuments: [
        {
          originalFilename: "citizenship.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2048
        }
      ]
    };

    const result = (await service.createTask(customerUser, dto, {})) as {
      taskName: string;
      status: string;
      supportingDocuments: Array<{ fileId: string; status: string }>;
    };

    expect(query.mock.calls[0][1][1]).toBe("SITA CUSTOMER-CITIZENSHIP-CDAO");
    expect(query.mock.calls[1][1][2]).toBe("citizenship.pdf");
    expect(result.taskName).toBe("SITA CUSTOMER-CITIZENSHIP-CDAO");
    expect(result.status).toBe("CREATED");
    expect(result.supportingDocuments).toEqual([
      expect.objectContaining({ fileId: "file-id", status: "PLACEHOLDER" })
    ]);
    expect(audit.write).toHaveBeenCalledWith(expect.objectContaining({ action: "TASK_CREATED" }));
  });

  it("returns nearby created requests without customer contact details", async () => {
    const { query, service } = createMocks();
    query
      .mockResolvedValueOnce({ rows: [agentLocationRow()] })
      .mockResolvedValueOnce({
        rows: [
          taskRow({
            distance_meters: "1234.4"
          })
        ]
      });

    const result = (await service.getNearbyRequests(agentUser)) as Array<{
      distanceMeters: number | null;
      customer: Record<string, unknown>;
    }>;

    expect(result).toHaveLength(1);
    expect(result[0].distanceMeters).toBe(1234);
    expect(result[0].customer.fullName).toBe("Sita Customer");
    expect(result[0].customer.phoneNumber).toBeUndefined();
  });

  it("accepts a nearby created request and returns assigned task details", async () => {
    const { audit, query, service } = createMocks();
    query
      .mockResolvedValueOnce({ rows: [agentLocationRow()] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "task-id",
            status: "CREATED",
            assigned_agent_user_id: null,
            distance_meters: 1500
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          taskRow({
            status: "ACCEPTED",
            assigned_agent_user_id: agentUser.id,
            assigned_agent_full_name: "Hari Agent",
            assigned_agent_phone_number: agentUser.phoneNumber,
            assigned_agent_profile_id: "agent-profile-id",
            assigned_agent_status: "PENDING_VERIFICATION",
            assigned_agent_permanent_latitude: 27.7002,
            assigned_agent_permanent_longitude: 85.3222,
            accepted_at: "2026-06-21T00:05:00.000Z"
          })
        ]
      });

    const result = (await service.acceptTask(agentUser, "task-id", {})) as {
      status: string;
      assignedAgent: { userId: string; fullName: string };
      customer: Record<string, unknown>;
    };

    expect(query.mock.calls[2][0]).toContain("UPDATE document_tasks");
    expect(result.status).toBe("ACCEPTED");
    expect(result.assignedAgent.userId).toBe(agentUser.id);
    expect(result.customer.phoneNumber).toBe(customerUser.phoneNumber);
    expect(audit.write).toHaveBeenCalledWith(expect.objectContaining({ action: "TASK_ACCEPTED" }));
  });

  it("rejects accepting an already accepted task", async () => {
    const { query, service } = createMocks();
    query
      .mockResolvedValueOnce({ rows: [agentLocationRow()] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "task-id",
            status: "ACCEPTED",
            assigned_agent_user_id: "other-agent-id",
            distance_meters: 1500
          }
        ]
      });

    await expect(service.acceptTask(agentUser, "task-id", {})).rejects.toBeInstanceOf(ConflictException);
  });
});
