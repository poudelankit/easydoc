import { IsArray, IsBoolean, IsOptional, IsUUID } from "class-validator";
import { CreateMessageDto } from "./create-message.dto";

export class TaskRoomEventDto {
  @IsUUID()
  taskId!: string;
}

export class SocketMessageDto extends CreateMessageDto {
  @IsUUID()
  taskId!: string;
}

export class TypingEventDto extends TaskRoomEventDto {
  @IsOptional()
  @IsBoolean()
  isTyping?: boolean;
}

export class ReadEventDto extends TaskRoomEventDto {
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  messageIds?: string[];
}
