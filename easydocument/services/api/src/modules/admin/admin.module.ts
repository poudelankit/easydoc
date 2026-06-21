import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { UsersModule } from "../users/users.module";
import { AdminController } from "./admin.controller";

@Module({
  imports: [UsersModule],
  controllers: [AdminController],
  providers: [RolesGuard]
})
export class AdminModule {}
