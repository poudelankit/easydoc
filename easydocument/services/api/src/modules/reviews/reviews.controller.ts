import { Body, Controller, Get, Headers, Ip, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { CreateReviewDto } from "./dto/create-review.dto";
import { ReviewsService } from "./reviews.service";

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CUSTOMER")
  @Post("tasks/:taskId/reviews")
  createTaskReview(
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.reviewsService.createTaskReview(taskId, user, dto, { ipAddress, userAgent });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CUSTOMER")
  @Get("customers/me/reviews")
  listCustomerReviews(@CurrentUser() user: AuthenticatedUser) {
    return this.reviewsService.listCustomerReviews(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("AGENT")
  @Get("agents/me/reviews")
  listAgentReviews(@CurrentUser() user: AuthenticatedUser) {
    return this.reviewsService.listAgentOwnReviews(user);
  }

  @Get("agents/:agentId/reviews")
  listPublicAgentReviews(@Param("agentId", ParseUUIDPipe) agentId: string) {
    return this.reviewsService.listAgentReviews(agentId);
  }

  @Get("agents/:agentId/reputation")
  getAgentReputation(@Param("agentId", ParseUUIDPipe) agentId: string) {
    return this.reviewsService.getAgentReputation(agentId);
  }
}
