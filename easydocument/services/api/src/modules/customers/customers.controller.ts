import { Body, Controller, Get, Headers, Ip, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { UsersService } from "../users/users.service";
import { RegisterCustomerDto } from "./dto/register-customer.dto";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("customers")
export class CustomersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles("CUSTOMER")
  @Post("register")
  register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterCustomerDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.usersService.updateProfile(user.id, dto, { ipAddress, userAgent });
  }

  @Roles("CUSTOMER")
  @Get("me")
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }

  @Roles("CUSTOMER")
  @Patch("me")
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserProfileDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.usersService.updateProfile(user.id, dto, { ipAddress, userAgent });
  }
}
