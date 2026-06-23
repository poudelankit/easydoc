import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export const DISPUTE_STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "CUSTOMER_ACTION_REQUIRED",
  "AGENT_ACTION_REQUIRED",
  "RESOLVED",
  "REJECTED",
  "CANCELLED"
] as const;

export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export class AddMediationNoteDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  note!: string;
}

export class UpdateDisputeStatusDto {
  @IsIn(DISPUTE_STATUSES)
  status!: DisputeStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class ResolveDisputeDto {
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  resolutionSummary!: string;
}
