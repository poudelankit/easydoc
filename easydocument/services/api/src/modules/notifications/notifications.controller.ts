import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { NotificationsService } from "./notifications.service";

@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  listNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.listForUser(user);
  }

  @Get("unread-count")
  getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(user);
  }

  @Post(":notificationId/read")
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param("notificationId", ParseUUIDPipe) notificationId: string
  ) {
    return this.notificationsService.markRead(user, notificationId);
  }

  @Post("read-all")
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user);
  }
}
