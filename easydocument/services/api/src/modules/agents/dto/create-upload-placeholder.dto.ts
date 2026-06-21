import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateUploadPlaceholderDto {
  @IsIn(["CITIZENSHIP_FRONT", "CITIZENSHIP_BACK", "SELFIE"])
  kind!: "CITIZENSHIP_FRONT" | "CITIZENSHIP_BACK" | "SELFIE";

  @IsString()
  @MaxLength(120)
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  sizeBytes!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  originalFilename?: string;
}
