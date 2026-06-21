import { Body, Controller, Get, Headers, Ip, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { AgentsService } from "./agents.service";
import { CreateUploadPlaceholderDto } from "./dto/create-upload-placeholder.dto";
import { RegisterAgentDto } from "./dto/register-agent.dto";
import { UpdateCurrentLocationDto } from "./dto/update-current-location.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("agents")
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post("citizenship-upload-placeholder")
  createCitizenshipUploadPlaceholder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUploadPlaceholderDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.agentsService.createUploadPlaceholder(user.id, dto, { ipAddress, userAgent });
  }

  @Post("register")
  register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterAgentDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.agentsService.register(user.id, dto, { ipAddress, userAgent });
  }

  @Roles("AGENT")
  @Get("me")
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.agentsService.getAgentProfileByUserId(user.id);
  }

  @Roles("AGENT")
  @Patch("me/location")
  updateCurrentLocation(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateCurrentLocationDto) {
    return this.agentsService.updateCurrentLocation(user.id, dto);
  }
}
