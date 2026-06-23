import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateDisputeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  reason!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;
}
