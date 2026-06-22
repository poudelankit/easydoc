import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { UsersModule } from "../users/users.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [UsersModule],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard]
})
export class AdminModule {}
