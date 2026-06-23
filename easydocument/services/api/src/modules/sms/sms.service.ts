import { Injectable } from "@nestjs/common";
import { randomInt } from "crypto";
import { writeStructuredLog } from "../../common/logging/structured-logger";

export type SmsProviderMode = "local-mock" | "provider-placeholder";

export interface SmsProviderStatus {
  mode: SmsProviderMode;
  providerName: string;
  configured: boolean;
}

export interface SendOtpSmsInput {
  phoneNumber: string;
  purpose: string;
}

@Injectable()
export class SmsService {
  async sendOtp(input: SendOtpSmsInput) {
    const status = this.getProviderStatus();
    const otp = status.mode === "local-mock" ? "123456" : String(randomInt(100000, 999999));

    writeStructuredLog("info", "sms.otp.delivery_prepared", {
      providerMode: status.mode,
      providerName: status.providerName,
      configured: status.configured,
      phoneNumberSuffix: input.phoneNumber.slice(-4),
      purpose: input.purpose
    });

    return {
      otp,
      providerMode: status.mode,
      providerName: status.providerName
    };
  }

  getProviderStatus(): SmsProviderStatus {
    const providerName = process.env.SMS_PROVIDER?.trim() || "local-mock";
    const mode: SmsProviderMode = providerName === "local-mock" ? "local-mock" : "provider-placeholder";
    const configured =
      mode === "local-mock"
        ? true
        : Boolean(process.env.SMS_PROVIDER_API_KEY?.trim() && process.env.SMS_PROVIDER_SENDER_ID?.trim());

    return {
      mode,
      providerName,
      configured
    };
  }
}
