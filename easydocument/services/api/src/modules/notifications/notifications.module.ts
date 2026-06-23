import { Global, Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, RolesGuard],
  exports: [NotificationsService]
})
export class NotificationsModule {}
