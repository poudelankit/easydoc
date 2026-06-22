import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CommunicationModule } from "../communication/communication.module";
import { UsersModule } from "../users/users.module";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  imports: [UsersModule, CommunicationModule],
  controllers: [TasksController],
  providers: [TasksService, RolesGuard],
  exports: [TasksService]
})
export class TasksModule {}
