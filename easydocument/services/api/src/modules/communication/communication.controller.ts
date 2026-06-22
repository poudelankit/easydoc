import { Body, Controller, Get, Headers, Ip, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { CommunicationService } from "./communication.service";
import { CreateAttachmentPlaceholderDto } from "./dto/create-attachment-placeholder.dto";
import { CreateMessageDto } from "./dto/create-message.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("CUSTOMER", "AGENT")
@Controller("tasks/:taskId")
export class CommunicationController {
  constructor(private readonly communication: CommunicationService) {}

  @Get("room")
  getRoom(
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.communication.getRoomForTask(taskId, user);
  }

  @Get("messages")
  listMessages(
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.communication.listMessages(taskId, user);
  }

  @Post("messages")
  sendMessage(
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMessageDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.communication.sendMessage(taskId, user, dto, { ipAddress, userAgent });
  }

  @Post("attachments")
  createAttachmentPlaceholder(
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAttachmentPlaceholderDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.communication.createAttachmentPlaceholder(taskId, user, dto, {
      ipAddress,
      userAgent
    });
  }
}
