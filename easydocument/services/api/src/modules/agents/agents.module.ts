import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TasksModule } from "../tasks/tasks.module";
import { UsersModule } from "../users/users.module";
import { AgentsController } from "./agents.controller";
import { AgentsService } from "./agents.service";

@Module({
  imports: [UsersModule, TasksModule],
  controllers: [AgentsController],
  providers: [AgentsService, RolesGuard]
})
export class AgentsModule {}
