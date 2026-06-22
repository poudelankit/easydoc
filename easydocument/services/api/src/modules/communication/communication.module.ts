import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { resolveJwtSecret } from "../../common/config/security-env";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CallsService } from "./calls.service";
import { CommunicationController } from "./communication.controller";
import { CommunicationGateway } from "./communication.gateway";
import { CommunicationService } from "./communication.service";

@Module({
  imports: [
    JwtModule.register({
      secret: resolveJwtSecret()
    })
  ],
  controllers: [CommunicationController],
  providers: [CommunicationService, CallsService, CommunicationGateway, RolesGuard],
  exports: [CommunicationService, CallsService]
})
export class CommunicationModule {}
