import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { UsersModule } from "../users/users.module";
import { AgentsController } from "./agents.controller";
import { AgentsService } from "./agents.service";

@Module({
  imports: [UsersModule],
  controllers: [AgentsController],
  providers: [AgentsService, RolesGuard]
})
export class AgentsModule {}
