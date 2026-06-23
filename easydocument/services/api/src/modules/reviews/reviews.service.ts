import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { QueryResultRow } from "pg";
import { AuthenticatedUser, RequestContext } from "../../common/types/authenticated-user";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";
import { CreateReviewDto } from "./dto/create-review.dto";

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

interface QueryExecutor {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<{
    rows: T[];
  }>;
}

interface ReviewableTaskRow extends QueryResultRow {
  id: string;
  task_name: string;
  status: TaskStatus;
  customer_user_id: string;
  assigned_agent_user_id: string | null;
}

interface AgentProfileRow extends QueryResultRow {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
}

interface ReviewRow extends QueryResultRow {
  id: string;
  task_id: string;
  task_name: string;
  task_status: TaskStatus;
  customer_user_id: string;
  customer_full_name: string;
  customer_phone_number: string;
  agent_user_id: string;
  agent_profile_id: string | null;
  agent_full_name: string;
  agent_phone_number: string;
  overall_rating: string | number;
  communication_rating: string | number;
  timeliness_rating: string | number;
  professionalism_rating: string | number;
  review_text: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ReputationMetricsRow extends QueryResultRow {
  average_overall_rating: string | number | null;
  average_communication_rating: string | number | null;
  average_timeliness_rating: string | number | null;
  average_professionalism_rating: string | number | null;
  total_completed_tasks: string | number;
  total_reviews: string | number;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService
  ) {}

  async createTaskReview(
    taskId: string,
    user: AuthenticatedUser,
    dto: CreateReviewDto,
    context: RequestContext
  ) {
    if (user.role !== "CUSTOMER") {
      throw new ForbiddenException("Only customers can review completed tasks");
    }

    const reviewId = await this.database.transaction(async (client) => {
      const task = await this.loadReviewableTask(client, taskId, true);
      this.assertTaskCanBeReviewed(task, user);

      const existingReview = await client.query<{ id: string }>(
        `SELECT id
         FROM task_reviews
         WHERE task_id = $1`,
        [task.id]
      );

      if (existingReview.rows[0]) {
        throw new ConflictException("A review has already been submitted for this task");
      }

      const result = await client.query<{ id: string }>(
        `INSERT INTO task_reviews (
           task_id,
           customer_user_id,
           agent_user_id,
           overall_rating,
           communication_rating,
           timeliness_rating,
           professionalism_rating,
           review_text
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          task.id,
          task.customer_user_id,
          task.assigned_agent_user_id,
          dto.overallRating,
          dto.communicationRating,
          dto.timelinessRating,
          dto.professionalismRating,
          this.cleanReviewText(dto.reviewText)
        ]
      );

      const review = result.rows[0];
      if (!review) {
        throw new BadRequestException("Review could not be submitted");
      }
      return review.id;
    });

    await this.audit.write({
      actorUserId: user.id,
      action: "TASK_REVIEW_CREATED",
      entityType: "task_reviews",
      entityId: reviewId,
      afterData: {
        taskId,
        overallRating: dto.overallRating,
        communicationRating: dto.communicationRating,
        timelinessRating: dto.timelinessRating,
        professionalismRating: dto.professionalismRating
      },
      context
    });

    return this.getReviewById(reviewId);
  }

  async listCustomerReviews(user: AuthenticatedUser) {
    if (user.role !== "CUSTOMER") {
      throw new ForbiddenException("Only customers can view submitted reviews");
    }

    const result = await this.database.query<ReviewRow>(
      `${this.reviewSelect()}
       WHERE review.customer_user_id = $1
       ORDER BY review.created_at DESC`,
      [user.id]
    );

    return result.rows.map((row) => this.mapReview(row, false));
  }

  async listAgentOwnReviews(user: AuthenticatedUser) {
    if (user.role !== "AGENT") {
      throw new ForbiddenException("Only agents can view received reviews");
    }

    const result = await this.database.query<ReviewRow>(
      `${this.reviewSelect()}
       WHERE review.agent_user_id = $1
       ORDER BY review.created_at DESC`,
      [user.id]
    );

    return result.rows.map((row) => this.mapReview(row, false));
  }

  async listAgentReviews(agentId: string) {
    const agent = await this.loadAgentProfile(agentId);
    const result = await this.database.query<ReviewRow>(
      `${this.reviewSelect()}
       WHERE review.agent_user_id = $1
       ORDER BY review.created_at DESC
       LIMIT 50`,
      [agent.user_id]
    );

    return result.rows.map((row) => this.mapReview(row, false));
  }

  async getAgentReputation(agentId: string) {
    const agent = await this.loadAgentProfile(agentId);
    const [metricsResult, reviewsResult] = await Promise.all([
      this.database.query<ReputationMetricsRow>(
        `SELECT
           ROUND(AVG(review.overall_rating)::numeric, 2) AS average_overall_rating,
           ROUND(AVG(review.communication_rating)::numeric, 2) AS average_communication_rating,
           ROUND(AVG(review.timeliness_rating)::numeric, 2) AS average_timeliness_rating,
           ROUND(AVG(review.professionalism_rating)::numeric, 2) AS average_professionalism_rating,
           (
             SELECT COUNT(*)
             FROM document_tasks task
             WHERE task.assigned_agent_user_id = $1
               AND task.status = 'COMPLETED'
           ) AS total_completed_tasks,
           COUNT(review.id) AS total_reviews
         FROM task_reviews review
         WHERE review.agent_user_id = $1`,
        [agent.user_id]
      ),
      this.database.query<ReviewRow>(
        `${this.reviewSelect()}
         WHERE review.agent_user_id = $1
         ORDER BY review.created_at DESC
         LIMIT 5`,
        [agent.user_id]
      )
    ]);

    const metrics = metricsResult.rows[0];
    return {
      agent: {
        profileId: agent.id,
        userId: agent.user_id,
        fullName: agent.full_name
      },
      averageOverallRating: this.numberOrZero(metrics?.average_overall_rating),
      averageCommunicationRating: this.numberOrZero(metrics?.average_communication_rating),
      averageTimelinessRating: this.numberOrZero(metrics?.average_timeliness_rating),
      averageProfessionalismRating: this.numberOrZero(metrics?.average_professionalism_rating),
      totalCompletedTasks: Number(metrics?.total_completed_tasks ?? 0),
      totalReviews: Number(metrics?.total_reviews ?? 0),
      recentReviews: reviewsResult.rows.map((row) => this.mapReview(row, false))
    };
  }

  async listAdminReviews() {
    const result = await this.database.query<ReviewRow>(
      `${this.reviewSelect()}
       ORDER BY review.created_at DESC
       LIMIT 100`
    );

    return result.rows.map((row) => this.mapReview(row, true));
  }

  private async getReviewById(reviewId: string) {
    const result = await this.database.query<ReviewRow>(
      `${this.reviewSelect()}
       WHERE review.id = $1
       LIMIT 1`,
      [reviewId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Review not found");
    }
    return this.mapReview(row, false);
  }

  private async loadReviewableTask(
    executor: QueryExecutor,
    taskId: string,
    forUpdate = false
  ) {
    const result = await executor.query<ReviewableTaskRow>(
      `SELECT
         id,
         task_name,
         status::text AS status,
         customer_user_id,
         assigned_agent_user_id
       FROM document_tasks
       WHERE id = $1
       ${forUpdate ? "FOR UPDATE" : ""}`,
      [taskId]
    );

    const task = result.rows[0];
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    return task;
  }

  private async loadAgentProfile(agentId: string) {
    const result = await this.database.query<AgentProfileRow>(
      `SELECT
         profile.id,
         profile.user_id,
         user_account.full_name,
         user_account.phone_number
       FROM agent_profiles profile
       JOIN users user_account ON user_account.id = profile.user_id
       WHERE profile.id = $1
       LIMIT 1`,
      [agentId]
    );

    const agent = result.rows[0];
    if (!agent) {
      throw new NotFoundException("Agent profile not found");
    }
    return agent;
  }

  private assertTaskCanBeReviewed(task: ReviewableTaskRow, user: AuthenticatedUser) {
    if (task.customer_user_id !== user.id) {
      throw new ForbiddenException("Only the task customer can review the assigned agent");
    }

    if (task.assigned_agent_user_id === user.id) {
      throw new ForbiddenException("Agents cannot review themselves");
    }

    if (!task.assigned_agent_user_id) {
      throw new ConflictException("Task must have an assigned agent before it can be reviewed");
    }

    if (task.status !== "COMPLETED") {
      throw new ConflictException("Task must be COMPLETED before it can be reviewed");
    }
  }

  private reviewSelect() {
    return `SELECT
        review.id,
        review.task_id,
        task.task_name,
        task.status::text AS task_status,
        review.customer_user_id,
        customer_user.full_name AS customer_full_name,
        customer_user.phone_number AS customer_phone_number,
        review.agent_user_id,
        agent_profile.id AS agent_profile_id,
        agent_user.full_name AS agent_full_name,
        agent_user.phone_number AS agent_phone_number,
        review.overall_rating,
        review.communication_rating,
        review.timeliness_rating,
        review.professionalism_rating,
        review.review_text,
        review.created_at,
        review.updated_at
      FROM task_reviews review
      JOIN document_tasks task ON task.id = review.task_id
      JOIN users customer_user ON customer_user.id = review.customer_user_id
      JOIN users agent_user ON agent_user.id = review.agent_user_id
      LEFT JOIN agent_profiles agent_profile ON agent_profile.user_id = review.agent_user_id`;
  }

  private mapReview(row: ReviewRow, includePhoneNumbers: boolean) {
    const customer: Record<string, unknown> = {
      userId: row.customer_user_id,
      fullName: row.customer_full_name
    };
    const agent: Record<string, unknown> = {
      userId: row.agent_user_id,
      profileId: row.agent_profile_id,
      fullName: row.agent_full_name
    };

    if (includePhoneNumbers) {
      customer.phoneNumber = row.customer_phone_number;
      agent.phoneNumber = row.agent_phone_number;
    }

    return {
      id: row.id,
      taskId: row.task_id,
      taskName: row.task_name,
      taskStatus: row.task_status,
      customer,
      agent,
      ratings: {
        overall: Number(row.overall_rating),
        communication: Number(row.communication_rating),
        timeliness: Number(row.timeliness_rating),
        professionalism: Number(row.professionalism_rating)
      },
      reviewText: row.review_text,
      createdAt: this.dateOrNull(row.created_at),
      updatedAt: this.dateOrNull(row.updated_at)
    };
  }

  private cleanReviewText(value?: string) {
    const clean = value?.trim();
    return clean ? clean : null;
  }

  private numberOrZero(value: string | number | null | undefined) {
    return value === null || value === undefined ? 0 : Number(value);
  }

  private dateOrNull(value: Date | string | null) {
    return value ? new Date(value).toISOString() : null;
  }
}
