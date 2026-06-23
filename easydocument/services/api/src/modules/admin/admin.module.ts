import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { DisputesModule } from "../disputes/disputes.module";
import { ReviewsModule } from "../reviews/reviews.module";
import { UsersModule } from "../users/users.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [UsersModule, DisputesModule, ReviewsModule],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard]
})
export class AdminModule {}
