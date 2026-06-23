import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { DisputesController } from "./disputes.controller";
import { DisputesService } from "./disputes.service";

@Module({
  controllers: [DisputesController],
  providers: [DisputesService, RolesGuard],
  exports: [DisputesService]
})
export class DisputesModule {}
