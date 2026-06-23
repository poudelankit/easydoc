import { ConflictException, ForbiddenException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { ReviewsService } from "./reviews.service";

const taskId = "11111111-1111-1111-1111-111111111111";
const reviewId = "22222222-2222-2222-2222-222222222222";
const agentProfileId = "33333333-3333-3333-3333-333333333333";

const customerUser = {
  id: "44444444-4444-4444-4444-444444444444",
  phoneNumber: "+9779800000000",
  role: "CUSTOMER" as const
};

const otherCustomerUser = {
  id: "55555555-5555-5555-5555-555555555555",
  phoneNumber: "+9779800000002",
  role: "CUSTOMER" as const
};

const agentUser = {
  id: "66666666-6666-6666-6666-666666666666",
  phoneNumber: "+9779700000000",
  role: "AGENT" as const
};

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: taskId,
    task_name: "CUSTOMER-PASSPORT-ORG",
    status: "COMPLETED",
    customer_user_id: customerUser.id,
    assigned_agent_user_id: agentUser.id,
    ...overrides
  };
}

function reviewRow(overrides: Record<string, unknown> = {}) {
  return {
    id: reviewId,
    task_id: taskId,
    task_name: "CUSTOMER-PASSPORT-ORG",
    task_status: "COMPLETED",
    customer_user_id: customerUser.id,
    customer_full_name: "Customer One",
    customer_phone_number: customerUser.phoneNumber,
    agent_user_id: agentUser.id,
    agent_profile_id: agentProfileId,
    agent_full_name: "Agent One",
    agent_phone_number: agentUser.phoneNumber,
    overall_rating: 5,
    communication_rating: 4,
    timeliness_rating: 5,
    professionalism_rating: 5,
    review_text: "Clear updates and fast delivery.",
    created_at: "2026-06-22T00:00:00.000Z",
    updated_at: "2026-06-22T00:00:00.000Z",
    ...overrides
  };
}

function agentProfileRow() {
  return {
    id: agentProfileId,
    user_id: agentUser.id,
    full_name: "Agent One",
    phone_number: agentUser.phoneNumber
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
  const service = new ReviewsService(
    database as unknown as DatabaseService,
    audit as unknown as AuditService
  );

  return { audit, database, query, service };
}

describe("ReviewsService", () => {
  it("lets the task customer review the assigned agent after completion", async () => {
    const { audit, query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [taskRow()] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: reviewId }] })
      .mockResolvedValueOnce({ rows: [reviewRow()] });

    const review = await service.createTaskReview(
      taskId,
      customerUser,
      {
        overallRating: 5,
        communicationRating: 4,
        timelinessRating: 5,
        professionalismRating: 5,
        reviewText: "Clear updates and fast delivery."
      },
      {}
    );

    expect(review.ratings.overall).toBe(5);
    expect(review.agent.profileId).toBe(agentProfileId);
    expect(query.mock.calls[2][1]).toEqual([
      taskId,
      customerUser.id,
      agentUser.id,
      5,
      4,
      5,
      5,
      "Clear updates and fast delivery."
    ]);
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TASK_REVIEW_CREATED" })
    );
  });

  it("prevents duplicate reviews for the same completed task", async () => {
    const { query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [taskRow()] })
      .mockResolvedValueOnce({ rows: [{ id: reviewId }] });

    await expect(
      service.createTaskReview(
        taskId,
        customerUser,
        {
          overallRating: 5,
          communicationRating: 5,
          timelinessRating: 5,
          professionalismRating: 5
        },
        {}
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("requires a completed task before review submission", async () => {
    const { query, service } = createService();
    query.mockResolvedValueOnce({ rows: [taskRow({ status: "DELIVERED" })] });

    await expect(
      service.createTaskReview(
        taskId,
        customerUser,
        {
          overallRating: 4,
          communicationRating: 4,
          timelinessRating: 4,
          professionalismRating: 4
        },
        {}
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("blocks unrelated customers from reviewing another customer's task", async () => {
    const { query, service } = createService();
    query.mockResolvedValueOnce({ rows: [taskRow()] });

    await expect(
      service.createTaskReview(
        taskId,
        otherCustomerUser,
        {
          overallRating: 4,
          communicationRating: 4,
          timelinessRating: 4,
          professionalismRating: 4
        },
        {}
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("validates rating values between one and five", async () => {
    const dto = plainToInstance(CreateReviewDto, {
      overallRating: 6,
      communicationRating: 0,
      timelinessRating: 3,
      professionalismRating: 4
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["overallRating", "communicationRating"])
    );
  });

  it("calculates agent reputation from completed tasks and reviews", async () => {
    const { query, service } = createService();
    query
      .mockResolvedValueOnce({ rows: [agentProfileRow()] })
      .mockResolvedValueOnce({
        rows: [
          {
            average_overall_rating: "4.50",
            average_communication_rating: "4.00",
            average_timeliness_rating: "5.00",
            average_professionalism_rating: "4.50",
            total_completed_tasks: 3,
            total_reviews: 2
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [reviewRow()] });

    const reputation = await service.getAgentReputation(agentProfileId);

    expect(reputation.averageOverallRating).toBe(4.5);
    expect(reputation.averageCommunicationRating).toBe(4);
    expect(reputation.totalCompletedTasks).toBe(3);
    expect(reputation.totalReviews).toBe(2);
    expect(reputation.recentReviews[0].taskId).toBe(taskId);
  });
});
