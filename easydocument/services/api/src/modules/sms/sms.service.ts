import { Inject, Injectable, Optional, ServiceUnavailableException } from "@nestjs/common";
import { randomInt } from "crypto";
import { getNodeEnv } from "../../common/config/security-env";
import { writeStructuredLog } from "../../common/logging/structured-logger";

export type SmsProviderMode =
  | "local-mock"
  | "provider-placeholder"
  | "staging-real-provider"
  | "production-real-provider";

export interface SmsProviderStatus {
  mode: SmsProviderMode;
  providerName: string;
  configured: boolean;
  endpointConfigured: boolean;
  senderConfigured: boolean;
}

export interface SendOtpSmsInput {
  phoneNumber: string;
  purpose: string;
}

export interface SmsSendResult {
  success: boolean;
  providerName: string;
  providerMode: SmsProviderMode;
  providerMessageId?: string;
  statusCode?: number;
  retryable: boolean;
}

export interface SmsHttpTransport {
  postJson(input: {
    url: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
    timeoutMs: number;
  }): Promise<{
    ok: boolean;
    statusCode: number;
    body?: unknown;
  }>;
}

export interface SmsProvider {
  status(): SmsProviderStatus;
  sendOtp(input: SendOtpSmsInput & { otp: string }): Promise<SmsSendResult>;
}

export const SMS_HTTP_TRANSPORT = Symbol("SMS_HTTP_TRANSPORT");

class FetchSmsHttpTransport implements SmsHttpTransport {
  async postJson(input: {
    url: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
    timeoutMs: number;
  }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
    try {
      const response = await fetch(input.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...input.headers
        },
        body: JSON.stringify(input.body),
        signal: controller.signal
      });

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = undefined;
      }

      return {
        ok: response.ok,
        statusCode: response.status,
        body
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

class LocalMockSmsProvider implements SmsProvider {
  status(): SmsProviderStatus {
    return {
      mode: "local-mock",
      providerName: "local-mock",
      configured: true,
      endpointConfigured: true,
      senderConfigured: true
    };
  }

  async sendOtp(): Promise<SmsSendResult> {
    return {
      success: true,
      providerName: "local-mock",
      providerMode: "local-mock",
      retryable: false
    };
  }
}

export class HttpSmsProviderAdapter implements SmsProvider {
  constructor(
    private readonly config: {
      providerName: string;
      mode: SmsProviderMode;
      endpoint: string;
      apiKey: string;
      senderId: string;
      timeoutMs: number;
    },
    private readonly transport: SmsHttpTransport = new FetchSmsHttpTransport()
  ) {}

  status(): SmsProviderStatus {
    return {
      mode: this.config.mode,
      providerName: this.config.providerName,
      configured: Boolean(this.config.endpoint && this.config.apiKey && this.config.senderId),
      endpointConfigured: Boolean(this.config.endpoint),
      senderConfigured: Boolean(this.config.senderId)
    };
  }

  async sendOtp(input: SendOtpSmsInput & { otp: string }): Promise<SmsSendResult> {
    const response = await this.transport.postJson({
      url: this.config.endpoint,
      timeoutMs: this.config.timeoutMs,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "X-Sender-Id": this.config.senderId
      },
      body: {
        to: input.phoneNumber,
        senderId: this.config.senderId,
        template: "OTP",
        purpose: input.purpose,
        message: `Your EasyDocument verification code is ${input.otp}. It expires in 5 minutes.`
      }
    });

    const providerMessageId = extractProviderMessageId(response.body);
    return {
      success: response.ok,
      providerName: this.config.providerName,
      providerMode: this.config.mode,
      providerMessageId,
      statusCode: response.statusCode,
      retryable: isRetryableStatus(response.statusCode)
    };
  }
}

@Injectable()
export class SmsService {
  constructor(
    @Optional()
    @Inject(SMS_HTTP_TRANSPORT)
    private readonly transport: SmsHttpTransport = new FetchSmsHttpTransport()
  ) {}

  async sendOtp(input: SendOtpSmsInput) {
    const provider = this.resolveProvider();
    const status = provider.status();
    const otp = status.mode === "local-mock" ? "123456" : String(randomInt(100000, 999999));

    if (!status.configured) {
      this.logDelivery("sms.otp.delivery_failed", input, status, {
        retryable: false,
        reason: "provider_not_configured"
      });
      throw new ServiceUnavailableException("SMS provider is not configured");
    }

    try {
      const result = await provider.sendOtp({ ...input, otp });
      if (!result.success) {
        this.logDelivery("sms.otp.delivery_failed", input, status, {
          statusCode: result.statusCode,
          retryable: result.retryable,
          hasProviderMessageId: Boolean(result.providerMessageId)
        });
        throw new ServiceUnavailableException(
          result.retryable ? "SMS provider temporarily unavailable" : "SMS provider rejected the request"
        );
      }

      this.logDelivery("sms.otp.delivery_succeeded", input, status, {
        statusCode: result.statusCode,
        retryable: false,
        hasProviderMessageId: Boolean(result.providerMessageId)
      });

      return {
        otp,
        providerMode: status.mode,
        providerName: status.providerName
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logDelivery("sms.otp.delivery_failed", input, status, {
        retryable: true,
        reason: error instanceof Error ? error.name : "unknown_error"
      });
      throw new ServiceUnavailableException("SMS provider temporarily unavailable");
    }
  }

  getProviderStatus(): SmsProviderStatus {
    return this.resolveProvider().status();
  }

  resolveProvider(): SmsProvider {
    const providerName = process.env.SMS_PROVIDER?.trim() || "local-mock";
    if (providerName === "local-mock") {
      return new LocalMockSmsProvider();
    }

    return new HttpSmsProviderAdapter(
      {
        providerName,
        mode: resolveRealProviderMode(),
        endpoint: process.env.SMS_PROVIDER_ENDPOINT?.trim() ?? "",
        apiKey: process.env.SMS_PROVIDER_API_KEY?.trim() ?? "",
        senderId: process.env.SMS_PROVIDER_SENDER_ID?.trim() ?? "",
        timeoutMs: envInteger("SMS_PROVIDER_TIMEOUT_MS", 5000)
      },
      this.transport
    );
  }

  private logDelivery(
    event: string,
    input: SendOtpSmsInput,
    status: SmsProviderStatus,
    details: Record<string, unknown>
  ) {
    writeStructuredLog(event === "sms.otp.delivery_failed" ? "warn" : "info", event, {
      providerMode: status.mode,
      providerName: status.providerName,
      configured: status.configured,
      phoneNumberSuffix: input.phoneNumber.slice(-4),
      purpose: input.purpose,
      ...details
    });
  }
}

function resolveRealProviderMode(): SmsProviderMode {
  const nodeEnv = getNodeEnv();
  if (nodeEnv === "production") {
    return "production-real-provider";
  }
  if (nodeEnv === "staging") {
    return "staging-real-provider";
  }
  return "provider-placeholder";
}

function envInteger(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function isRetryableStatus(statusCode: number) {
  return statusCode === 408 || statusCode === 409 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
}

function extractProviderMessageId(body: unknown) {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const objectBody = body as Record<string, unknown>;
  const value = objectBody.messageId ?? objectBody.message_id ?? objectBody.id;
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
