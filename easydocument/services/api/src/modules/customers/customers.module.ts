import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { UsersModule } from "../users/users.module";
import { CustomersController } from "./customers.controller";

@Module({
  imports: [UsersModule],
  controllers: [CustomersController],
  providers: [RolesGuard]
})
export class CustomersModule {}
