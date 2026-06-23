import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateReviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  communicationRating!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  timelinessRating!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  professionalismRating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewText?: string;
}
