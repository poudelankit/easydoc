import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @IsIn(["REGISTER", "LOGIN", "RESET"])
  purpose!: "REGISTER" | "LOGIN" | "RESET";
}
