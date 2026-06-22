import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export type CommunicationAttachmentType = "IMAGE" | "DOCUMENT" | "AUDIO" | "VIDEO";

export class CreateAttachmentPlaceholderDto {
  @IsIn(["IMAGE", "DOCUMENT", "AUDIO", "VIDEO"])
  attachmentType!: CommunicationAttachmentType;

  @IsString()
  @MaxLength(120)
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100 * 1024 * 1024)
  sizeBytes!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  originalFilename?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;
}
