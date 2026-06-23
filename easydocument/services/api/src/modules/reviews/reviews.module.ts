import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, RolesGuard],
  exports: [ReviewsService]
})
export class ReviewsModule {}
