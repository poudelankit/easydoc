import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength
} from "class-validator";

export class RegisterAgentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(80)
  citizenshipNumber!: string;

  @IsUUID()
  citizenshipFrontFileId!: string;

  @IsUUID()
  citizenshipBackFileId!: string;

  @IsUUID()
  selfieFileId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  permanentAddressText!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  permanentLatitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  permanentLongitude!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  serviceTags?: string[];
}
