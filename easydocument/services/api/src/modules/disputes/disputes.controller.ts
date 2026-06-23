import { Body, Controller, Get, Headers, Ip, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { CreateDisputeDto } from "./dto/create-dispute.dto";
import { DisputesService } from "./disputes.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Roles("CUSTOMER", "AGENT")
  @Post("tasks/:taskId/disputes")
  createTaskDispute(
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDisputeDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.disputesService.createTaskDispute(taskId, user, dto, { ipAddress, userAgent });
  }

  @Roles("CUSTOMER", "AGENT")
  @Get("tasks/:taskId/disputes")
  listTaskDisputes(
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.disputesService.listTaskDisputes(taskId, user);
  }

  @Roles("CUSTOMER", "AGENT")
  @Get("disputes/:disputeId")
  getDispute(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.disputesService.getParticipantDispute(disputeId, user);
  }
}
