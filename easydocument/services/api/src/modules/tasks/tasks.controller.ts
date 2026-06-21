import { Body, Controller, Get, Headers, Ip, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { CreateTaskDto } from "./dto/create-task.dto";
import { TasksService } from "./tasks.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Roles("CUSTOMER")
  @Post()
  createTask(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.tasksService.createTask(user, dto, { ipAddress, userAgent });
  }

  @Roles("CUSTOMER", "AGENT")
  @Get("me")
  getMyTasks(@CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.getMyTasks(user);
  }

  @Roles("CUSTOMER", "AGENT")
  @Get(":id")
  getTaskById(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) taskId: string) {
    return this.tasksService.getTaskById(user, taskId);
  }
}
