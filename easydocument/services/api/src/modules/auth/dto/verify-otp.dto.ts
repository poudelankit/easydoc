import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from "class-validator";

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @IsString()
  @Length(4, 8)
  otp!: string;

  @IsOptional()
  @IsIn(["REGISTER", "LOGIN", "RESET"])
  purpose?: "REGISTER" | "LOGIN" | "RESET";
}
