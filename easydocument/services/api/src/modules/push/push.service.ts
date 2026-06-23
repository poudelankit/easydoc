import { Inject, Injectable, Optional, ServiceUnavailableException } from "@nestjs/common";
import { createSign } from "crypto";
import { readFileSync } from "fs";
import { getNodeEnv } from "../../common/config/security-env";
import { writeStructuredLog } from "../../common/logging/structured-logger";

export type PushProviderMode = "placeholder" | "firebase-placeholder" | "staging-real-provider" | "production-real-provider";

export interface PushProviderStatus {
  mode: PushProviderMode;
  providerName: string;
  configured: boolean;
  projectId: string | null;
  serviceAccountReference: string | null;
  credentialSource: "none" | "env-json" | "file-path" | "secret-reference";
  credentialError?: string;
}

export interface PushNotificationPlaceholderInput {
  notificationId: string;
  recipientUserId: string;
  type: string;
  title: string;
  body?: string;
  deviceToken?: string | null;
}

export interface PushSendResult {
  success: boolean;
  providerName: string;
  providerMode: PushProviderMode;
  statusCode?: number;
  providerMessageId?: string;
  retryable: boolean;
  skipped?: boolean;
}

export interface PushHttpTransport {
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

export interface FirebaseTokenProvider {
  getAccessToken(): Promise<string>;
}

export interface PushProvider {
  status(): PushProviderStatus;
  send(input: PushNotificationPlaceholderInput): Promise<PushSendResult>;
}

export const PUSH_HTTP_TRANSPORT = Symbol("PUSH_HTTP_TRANSPORT");

class FetchPushHttpTransport implements PushHttpTransport {
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

class PlaceholderPushProvider implements PushProvider {
  status(): PushProviderStatus {
    return {
      mode: "placeholder",
      providerName: "placeholder",
      configured: true,
      projectId: null,
      serviceAccountReference: null,
      credentialSource: "none"
    };
  }

  async send(): Promise<PushSendResult> {
    return {
      success: true,
      providerName: "placeholder",
      providerMode: "placeholder",
      retryable: false,
      skipped: true
    };
  }
}

export class ServiceAccountFirebaseTokenProvider implements FirebaseTokenProvider {
  constructor(
    private readonly credential: FirebaseServiceAccount,
    private readonly transport: PushHttpTransport,
    private readonly timeoutMs: number
  ) {}

  async getAccessToken() {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const assertion = signJwt(
      {
        alg: "RS256",
        typ: "JWT"
      },
      {
        iss: this.credential.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: this.credential.token_uri,
        iat: nowSeconds,
        exp: nowSeconds + 3600
      },
      this.credential.private_key
    );

    const response = await this.transport.postJson({
      url: this.credential.token_uri,
      timeoutMs: this.timeoutMs,
      headers: {},
      body: {
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion
      }
    });

    if (!response.ok) {
      throw new Error(`Firebase token request failed with status ${response.statusCode}`);
    }

    const body = response.body as Record<string, unknown> | undefined;
    const token = body?.access_token;
    if (typeof token !== "string" || token.length === 0) {
      throw new Error("Firebase token response did not include an access token");
    }
    return token;
  }
}

export class StaticFirebaseTokenProvider implements FirebaseTokenProvider {
  constructor(private readonly token: string) {}

  async getAccessToken() {
    return this.token;
  }
}

export class FirebasePushProviderAdapter implements PushProvider {
  constructor(
    private readonly config: {
      mode: PushProviderMode;
      projectId: string | null;
      credentialSource: PushProviderStatus["credentialSource"];
      serviceAccountReference: string | null;
      credentialError?: string;
      timeoutMs: number;
    },
    private readonly transport: PushHttpTransport = new FetchPushHttpTransport(),
    private readonly tokenProvider?: FirebaseTokenProvider
  ) {}

  status(): PushProviderStatus {
    return {
      mode: this.config.mode,
      providerName: "firebase",
      configured: Boolean(this.config.projectId && this.config.serviceAccountReference && !this.config.credentialError),
      projectId: this.config.projectId,
      serviceAccountReference: this.config.serviceAccountReference,
      credentialSource: this.config.credentialSource,
      credentialError: this.config.credentialError
    };
  }

  async send(input: PushNotificationPlaceholderInput): Promise<PushSendResult> {
    if (!input.deviceToken) {
      return {
        success: true,
        providerName: "firebase",
        providerMode: this.config.mode,
        retryable: false,
        skipped: true
      };
    }

    if (!this.tokenProvider || !this.config.projectId) {
      return {
        success: false,
        providerName: "firebase",
        providerMode: this.config.mode,
        retryable: false
      };
    }

    const accessToken = await this.tokenProvider.getAccessToken();
    const response = await this.transport.postJson({
      url: `https://fcm.googleapis.com/v1/projects/${this.config.projectId}/messages:send`,
      timeoutMs: this.config.timeoutMs,
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: {
        message: {
          token: input.deviceToken,
          notification: {
            title: input.title,
            body: input.body ?? input.title
          },
          data: {
            notificationId: input.notificationId,
            type: input.type
          }
        }
      }
    });

    return {
      success: response.ok,
      providerName: "firebase",
      providerMode: this.config.mode,
      statusCode: response.statusCode,
      providerMessageId: extractFirebaseMessageId(response.body),
      retryable: isRetryableStatus(response.statusCode)
    };
  }
}

@Injectable()
export class PushService {
  constructor(
    @Optional()
    @Inject(PUSH_HTTP_TRANSPORT)
    private readonly transport: PushHttpTransport = new FetchPushHttpTransport()
  ) {}

  async publishPlaceholder(input: PushNotificationPlaceholderInput) {
    const provider = this.resolveProvider();
    const status = provider.status();

    if (!status.configured) {
      this.logDelivery("push.notification.delivery_failed", input, status, {
        retryable: false,
        reason: "provider_not_configured"
      });
      return {
        accepted: false,
        providerMode: status.mode,
        providerName: status.providerName
      };
    }

    try {
      const result = await provider.send(input);
      if (!result.success) {
        this.logDelivery("push.notification.delivery_failed", input, status, {
          statusCode: result.statusCode,
          retryable: result.retryable,
          hasProviderMessageId: Boolean(result.providerMessageId),
          skipped: Boolean(result.skipped)
        });
        throw new ServiceUnavailableException(
          result.retryable ? "Push provider temporarily unavailable" : "Push provider rejected the request"
        );
      }

      this.logDelivery("push.notification.delivery_succeeded", input, status, {
        statusCode: result.statusCode,
        retryable: false,
        hasProviderMessageId: Boolean(result.providerMessageId),
        skipped: Boolean(result.skipped)
      });

      return {
        accepted: true,
        providerMode: status.mode,
        providerName: status.providerName
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logDelivery("push.notification.delivery_failed", input, status, {
        retryable: true,
        reason: error instanceof Error ? error.name : "unknown_error"
      });
      throw new ServiceUnavailableException("Push provider temporarily unavailable");
    }
  }

  getProviderStatus(): PushProviderStatus {
    return this.resolveProvider().status();
  }

  resolveProvider(): PushProvider {
    const providerName = process.env.PUSH_PROVIDER?.trim() || "placeholder";
    if (providerName !== "firebase") {
      return new PlaceholderPushProvider();
    }

    const credential = resolveFirebaseCredential();
    const timeoutMs = envInteger("FIREBASE_TIMEOUT_MS", 5000);
    const tokenProvider =
      credential.serviceAccount && credential.projectId
        ? new ServiceAccountFirebaseTokenProvider(credential.serviceAccount, this.transport, timeoutMs)
        : undefined;

    return new FirebasePushProviderAdapter(
      {
        mode: resolveFirebaseProviderMode(),
        projectId: credential.projectId,
        credentialSource: credential.credentialSource,
        serviceAccountReference: credential.serviceAccountReference,
        credentialError: credential.credentialError,
        timeoutMs
      },
      this.transport,
      tokenProvider
    );
  }

  private logDelivery(
    event: string,
    input: PushNotificationPlaceholderInput,
    status: PushProviderStatus,
    details: Record<string, unknown>
  ) {
    writeStructuredLog(event === "push.notification.delivery_failed" ? "warn" : "info", event, {
      notificationId: input.notificationId,
      recipientUserId: input.recipientUserId,
      type: input.type,
      providerMode: status.mode,
      providerName: status.providerName,
      configured: status.configured,
      projectId: status.projectId,
      credentialSource: status.credentialSource,
      hasDeviceToken: Boolean(input.deviceToken),
      credentialError: status.credentialError,
      ...details
    });
  }
}

interface FirebaseServiceAccount {
  project_id?: string;
  private_key: string;
  client_email: string;
  token_uri: string;
}

function resolveFirebaseCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || null;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  const secretReference = process.env.FIREBASE_SERVICE_ACCOUNT_SECRET_NAME?.trim() || null;

  if (json) {
    let serviceAccount: FirebaseServiceAccount;
    try {
      serviceAccount = parseServiceAccount(json);
    } catch {
      return {
        projectId,
        credentialSource: "env-json" as const,
        serviceAccountReference: "FIREBASE_SERVICE_ACCOUNT_JSON",
        serviceAccount: null,
        credentialError: "invalid_service_account_json"
      };
    }
    return {
      projectId: projectId ?? serviceAccount.project_id ?? null,
      credentialSource: "env-json" as const,
      serviceAccountReference: "FIREBASE_SERVICE_ACCOUNT_JSON",
      serviceAccount,
      credentialError: undefined
    };
  }

  if (path) {
    let serviceAccount: FirebaseServiceAccount;
    try {
      serviceAccount = parseServiceAccount(readFileSync(path, "utf8"));
    } catch {
      return {
        projectId,
        credentialSource: "file-path" as const,
        serviceAccountReference: path,
        serviceAccount: null,
        credentialError: "service_account_path_unavailable"
      };
    }
    return {
      projectId: projectId ?? serviceAccount.project_id ?? null,
      credentialSource: "file-path" as const,
      serviceAccountReference: path,
      serviceAccount,
      credentialError: undefined
    };
  }

  return {
    projectId,
    credentialSource: secretReference ? ("secret-reference" as const) : ("none" as const),
    serviceAccountReference: secretReference,
    serviceAccount: null,
    credentialError: undefined
  };
}

function parseServiceAccount(rawJson: string): FirebaseServiceAccount {
  const parsed = JSON.parse(rawJson) as Partial<FirebaseServiceAccount>;
  if (!parsed.private_key || !parsed.client_email) {
    throw new Error("Firebase service account must include private_key and client_email");
  }
  return {
    project_id: parsed.project_id,
    private_key: parsed.private_key,
    client_email: parsed.client_email,
    token_uri: parsed.token_uri ?? "https://oauth2.googleapis.com/token"
  };
}

function resolveFirebaseProviderMode(): PushProviderMode {
  const nodeEnv = getNodeEnv();
  if (nodeEnv === "production") {
    return "production-real-provider";
  }
  if (nodeEnv === "staging") {
    return "staging-real-provider";
  }
  return "firebase-placeholder";
}

function signJwt(header: Record<string, unknown>, payload: Record<string, unknown>, privateKey: string) {
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const content = `${encodedHeader}.${encodedPayload}`;
  const signature = createSign("RSA-SHA256").update(content).sign(privateKey);
  return `${content}.${base64Url(signature)}`;
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function envInteger(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function isRetryableStatus(statusCode: number) {
  return statusCode === 408 || statusCode === 409 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
}

function extractFirebaseMessageId(body: unknown) {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const objectBody = body as Record<string, unknown>;
  const value = objectBody.name ?? objectBody.messageId;
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
