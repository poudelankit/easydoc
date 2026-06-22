import { IsIn, IsObject, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export const CALL_TYPES = ["AUDIO", "VIDEO"] as const;
export type CallType = (typeof CALL_TYPES)[number];

export const CALL_END_STATUSES = ["ENDED", "MISSED", "FAILED"] as const;
export type CallEndStatus = (typeof CALL_END_STATUSES)[number];

export class CallNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class CreateCallDto extends CallNoteDto {
  @IsIn(CALL_TYPES)
  callType!: CallType;
}

export class EndCallDto extends CallNoteDto {
  @IsOptional()
  @IsIn(CALL_END_STATUSES)
  status?: CallEndStatus;
}

export class CallRequestEventDto extends CreateCallDto {
  @IsUUID()
  taskId!: string;
}

export class CallSessionEventDto extends CallNoteDto {
  @IsUUID()
  taskId!: string;

  @IsUUID()
  callId!: string;
}

export class EndCallEventDto extends CallSessionEventDto {
  @IsOptional()
  @IsIn(CALL_END_STATUSES)
  status?: CallEndStatus;
}

export class CallDescriptionEventDto {
  @IsUUID()
  taskId!: string;

  @IsUUID()
  callId!: string;

  @IsObject()
  description!: Record<string, unknown>;
}

export class CallIceCandidateEventDto {
  @IsUUID()
  taskId!: string;

  @IsUUID()
  callId!: string;

  @IsObject()
  candidate!: Record<string, unknown>;
}
