import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from "class-validator";

export class SupportingDocumentPlaceholderDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  originalFilename?: string;

  @IsString()
  @IsIn(["image/jpeg", "image/png", "application/pdf"])
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  sizeBytes!: number;
}

export class CreateTaskDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  documentType!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  organizationName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  organizationAddress!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  organizationLatitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  organizationLongitude!: number;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  requestDescription!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SupportingDocumentPlaceholderDto)
  supportingDocuments?: SupportingDocumentPlaceholderDto[];
}
