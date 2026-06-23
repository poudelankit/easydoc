import { Body, Controller, Get, Headers, Ip, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { AuditService } from "../audit/audit.service";
import {
  AddMediationNoteDto,
  ResolveDisputeDto,
  UpdateDisputeStatusDto
} from "../disputes/dto/admin-dispute.dto";
import { DisputesService } from "../disputes/disputes.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ReviewsService } from "../reviews/reviews.service";
import { UsersService } from "../users/users.service";
import { AdminService } from "./admin.service";
import { RejectAgentDto } from "./dto/reject-agent.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adminService: AdminService,
    private readonly disputesService: DisputesService,
    private readonly reviewsService: ReviewsService,
    private readonly notificationsService: NotificationsService,
    private readonly audit: AuditService
  ) {}

  @Get("me")
  async getAdminMe(@CurrentUser() user: AuthenticatedUser) {
    await this.auditAdminAccess(user, "ADMIN_PROFILE_ACCESSED", "users", user.id);
    return this.usersService.getProfile(user.id);
  }

  @Get("dashboard")
  async getDashboard(@CurrentUser() user: AuthenticatedUser) {
    await this.auditAdminAccess(user, "ADMIN_DASHBOARD_ACCESSED", "admin_dashboard");
    return this.adminService.getDashboard();
  }

  @Get("agents/pending")
  async listPendingAgents(@CurrentUser() user: AuthenticatedUser) {
    await this.auditAdminAccess(user, "ADMIN_PENDING_AGENTS_ACCESSED", "agent_profiles");
    return this.adminService.listPendingAgents();
  }

  @Get("agents/:agentId")
  async getAgent(
    @Param("agentId", ParseUUIDPipe) agentId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.auditAdminAccess(user, "ADMIN_AGENT_ACCESSED", "agent_profiles", agentId);
    return this.adminService.getAgent(agentId);
  }

  @Post("agents/:agentId/approve")
  approveAgent(
    @Param("agentId", ParseUUIDPipe) agentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.adminService.approveAgent(agentId, user, { ipAddress, userAgent });
  }

  @Post("agents/:agentId/reject")
  rejectAgent(
    @Param("agentId", ParseUUIDPipe) agentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RejectAgentDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.adminService.rejectAgent(agentId, user, dto, { ipAddress, userAgent });
  }

  @Get("tasks")
  async listTasks(@CurrentUser() user: AuthenticatedUser, @Query("status") status?: string) {
    await this.auditAdminAccess(user, "ADMIN_TASKS_ACCESSED", "document_tasks");
    return this.adminService.listTasks(status);
  }

  @Get("tasks/:taskId")
  async getTask(
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.auditAdminAccess(user, "ADMIN_TASK_ACCESSED", "document_tasks", taskId);
    return this.adminService.getTask(taskId);
  }

  @Get("tasks/:taskId/timeline")
  async getTaskTimeline(
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.auditAdminAccess(user, "ADMIN_TASK_TIMELINE_ACCESSED", "document_tasks", taskId);
    return this.adminService.getTaskTimeline(taskId);
  }

  @Get("tasks/:taskId/communication-audit")
  async getCommunicationAudit(
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.auditAdminAccess(user, "ADMIN_COMMUNICATION_AUDIT_ACCESSED", "document_tasks", taskId);
    return this.adminService.getCommunicationAudit(taskId);
  }

  @Get("disputes")
  async listDisputes(@CurrentUser() user: AuthenticatedUser, @Query("status") status?: string) {
    await this.auditAdminAccess(user, "ADMIN_DISPUTES_ACCESSED", "task_disputes");
    return this.disputesService.listAdminDisputes(status);
  }

  @Get("disputes/:disputeId")
  async getDispute(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.auditAdminAccess(user, "ADMIN_DISPUTE_ACCESSED", "task_disputes", disputeId);
    return this.disputesService.getAdminDispute(disputeId);
  }

  @Get("reviews")
  async listReviews(@CurrentUser() user: AuthenticatedUser) {
    await this.auditAdminAccess(user, "ADMIN_REVIEWS_ACCESSED", "task_reviews");
    return this.reviewsService.listAdminReviews();
  }

  @Get("notifications/summary")
  async getNotificationSummary(@CurrentUser() user: AuthenticatedUser) {
    await this.auditAdminAccess(user, "ADMIN_NOTIFICATIONS_SUMMARY_ACCESSED", "notifications");
    return this.notificationsService.getAdminSummary(user);
  }

  @Post("disputes/:disputeId/notes")
  addMediationNote(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddMediationNoteDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.disputesService.addMediationNote(disputeId, user, dto, { ipAddress, userAgent });
  }

  @Post("disputes/:disputeId/status")
  updateDisputeStatus(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDisputeStatusDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.disputesService.updateDisputeStatus(disputeId, user, dto, { ipAddress, userAgent });
  }

  @Post("disputes/:disputeId/resolve")
  resolveDispute(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResolveDisputeDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.disputesService.resolveDispute(disputeId, user, dto, { ipAddress, userAgent });
  }

  private async auditAdminAccess(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId?: string
  ) {
    await this.audit.write({
      actorUserId: user.id,
      action,
      entityType,
      entityId,
      context: {}
    });
  }
}
