import { IsString, MaxLength, MinLength } from "class-validator";

export class RegisterCustomerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  addressText!: string;
}
