import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { UsersModule } from "../users/users.module";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  imports: [UsersModule],
  controllers: [TasksController],
  providers: [TasksService, RolesGuard],
  exports: [TasksService]
})
export class TasksModule {}
