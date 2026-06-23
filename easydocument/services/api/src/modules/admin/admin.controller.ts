import { Body, Controller, Get, Headers, Ip, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import {
  AddMediationNoteDto,
  ResolveDisputeDto,
  UpdateDisputeStatusDto
} from "../disputes/dto/admin-dispute.dto";
import { DisputesService } from "../disputes/disputes.service";
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
    private readonly disputesService: DisputesService
  ) {}

  @Get("me")
  getAdminMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }

  @Get("dashboard")
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get("agents/pending")
  listPendingAgents() {
    return this.adminService.listPendingAgents();
  }

  @Get("agents/:agentId")
  getAgent(@Param("agentId", ParseUUIDPipe) agentId: string) {
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
  listTasks(@Query("status") status?: string) {
    return this.adminService.listTasks(status);
  }

  @Get("tasks/:taskId")
  getTask(@Param("taskId", ParseUUIDPipe) taskId: string) {
    return this.adminService.getTask(taskId);
  }

  @Get("tasks/:taskId/timeline")
  getTaskTimeline(@Param("taskId", ParseUUIDPipe) taskId: string) {
    return this.adminService.getTaskTimeline(taskId);
  }

  @Get("tasks/:taskId/communication-audit")
  getCommunicationAudit(@Param("taskId", ParseUUIDPipe) taskId: string) {
    return this.adminService.getCommunicationAudit(taskId);
  }

  @Get("disputes")
  listDisputes(@Query("status") status?: string) {
    return this.disputesService.listAdminDisputes(status);
  }

  @Get("disputes/:disputeId")
  getDispute(@Param("disputeId", ParseUUIDPipe) disputeId: string) {
    return this.disputesService.getAdminDispute(disputeId);
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
}
