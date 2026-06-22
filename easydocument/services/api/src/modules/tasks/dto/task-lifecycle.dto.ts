import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export const AGENT_PROGRESS_STATUSES = [
  "IN_PROGRESS",
  "DOCUMENT_REQUESTED",
  "VISITED_ORGANIZATION",
  "DOCUMENT_COLLECTED",
  "READY_FOR_DELIVERY",
  "DELIVERED"
] as const;

export type AgentProgressStatus = (typeof AGENT_PROGRESS_STATUSES)[number];

export class TaskLifecycleNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ExpectedCompletionDateDto extends TaskLifecycleNoteDto {
  @IsDateString()
  expectedCompletionDate!: string;
}

export class UpdateTaskStatusDto extends TaskLifecycleNoteDto {
  @IsIn(AGENT_PROGRESS_STATUSES)
  status!: AgentProgressStatus;
}
