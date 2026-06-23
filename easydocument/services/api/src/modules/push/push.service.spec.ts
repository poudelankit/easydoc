import { ServiceUnavailableException } from "@nestjs/common";
import {
  FirebasePushProviderAdapter,
  PushHttpTransport,
  PushService,
  StaticFirebaseTokenProvider
} from "./push.service";

describe("PushService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NODE_ENV;
    delete process.env.PUSH_PROVIDER;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_SECRET_NAME;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    delete process.env.FIREBASE_TIMEOUT_MS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("keeps placeholder push mode available locally", async () => {
    const service = new PushService();

    expect(service.getProviderStatus()).toMatchObject({
      mode: "placeholder",
      configured: true
    });
    await expect(
      service.publishPlaceholder({
        notificationId: "notification-id",
        recipientUserId: "user-id",
        type: "TASK_ACCEPTED",
        title: "Task accepted"
      })
    ).resolves.toMatchObject({ accepted: true, providerMode: "placeholder" });
  });

  it("represents Firebase with a service-account secret reference in development", async () => {
    process.env.PUSH_PROVIDER = "firebase";
    process.env.FIREBASE_PROJECT_ID = "easydocument-staging";
    process.env.FIREBASE_SERVICE_ACCOUNT_SECRET_NAME = "easydocument/firebase-service-account";
    const service = new PushService();

    expect(service.getProviderStatus()).toMatchObject({
      mode: "firebase-placeholder",
      providerName: "firebase",
      configured: true,
      credentialSource: "secret-reference",
      serviceAccountReference: "easydocument/firebase-service-account"
    });

    await expect(
      service.publishPlaceholder({
        notificationId: "notification-id",
        recipientUserId: "user-id",
        type: "TASK_ACCEPTED",
        title: "Task accepted"
      })
    ).resolves.toMatchObject({ accepted: true, providerMode: "firebase-placeholder" });
  });

  it("selects staging real-provider mode for Firebase in staging", () => {
    process.env.NODE_ENV = "staging";
    process.env.PUSH_PROVIDER = "firebase";
    process.env.FIREBASE_PROJECT_ID = "easydocument-staging";
    process.env.FIREBASE_SERVICE_ACCOUNT_SECRET_NAME = "easydocument/firebase-service-account";
    const service = new PushService();

    expect(service.getProviderStatus()).toMatchObject({
      mode: "staging-real-provider",
      providerName: "firebase",
      configured: true
    });
  });

  it("selects production real-provider mode for Firebase in production", () => {
    process.env.NODE_ENV = "production";
    process.env.PUSH_PROVIDER = "firebase";
    process.env.FIREBASE_PROJECT_ID = "easydocument-production";
    process.env.FIREBASE_SERVICE_ACCOUNT_SECRET_NAME = "easydocument/firebase-service-account";
    const service = new PushService();

    expect(service.getProviderStatus()).toMatchObject({
      mode: "production-real-provider",
      providerName: "firebase",
      configured: true
    });
  });

  it("reports invalid Firebase credentials as not configured", () => {
    process.env.PUSH_PROVIDER = "firebase";
    process.env.FIREBASE_PROJECT_ID = "easydocument-staging";
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = "not-json";
    const service = new PushService();

    expect(service.getProviderStatus()).toMatchObject({
      mode: "firebase-placeholder",
      providerName: "firebase",
      configured: false,
      credentialSource: "env-json",
      credentialError: "invalid_service_account_json"
    });
  });

  it("sends through the Firebase adapter with mocked transport and token provider", async () => {
    const transport = createPushTransport({
      ok: true,
      statusCode: 200,
      body: { name: "projects/easydocument/messages/message-id" }
    });
    const provider = new FirebasePushProviderAdapter(
      {
        mode: "staging-real-provider",
        projectId: "easydocument-staging",
        credentialSource: "env-json",
        serviceAccountReference: "FIREBASE_SERVICE_ACCOUNT_JSON",
        timeoutMs: 1000
      },
      transport,
      new StaticFirebaseTokenProvider("firebase-access-token")
    );

    const result = await provider.send({
      notificationId: "notification-id",
      recipientUserId: "user-id",
      type: "TASK_ACCEPTED",
      title: "Task accepted",
      body: "A task was accepted.",
      deviceToken: "device-token"
    });

    expect(result).toMatchObject({
      success: true,
      providerName: "firebase",
      providerMode: "staging-real-provider",
      providerMessageId: "projects/easydocument/messages/message-id",
      retryable: false
    });
    expect(transport.postJson).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://fcm.googleapis.com/v1/projects/easydocument-staging/messages:send",
        headers: expect.objectContaining({ Authorization: "Bearer firebase-access-token" }),
        body: expect.objectContaining({
          message: expect.objectContaining({
            token: "device-token",
            notification: {
              title: "Task accepted",
              body: "A task was accepted."
            }
          })
        })
      })
    );
  });

  it("does not require Firebase credentials for placeholder sends without a device token", async () => {
    process.env.PUSH_PROVIDER = "firebase";
    process.env.FIREBASE_PROJECT_ID = "easydocument-staging";
    process.env.FIREBASE_SERVICE_ACCOUNT_SECRET_NAME = "easydocument/firebase-service-account";
    const service = new PushService(createPushTransport());

    await expect(
      service.publishPlaceholder({
        notificationId: "notification-id",
        recipientUserId: "user-id",
        type: "TASK_ACCEPTED",
        title: "Task accepted"
      })
    ).resolves.toMatchObject({ accepted: true, providerMode: "firebase-placeholder" });
  });

  it("fails safely when Firebase send is rejected", async () => {
    const transport = createPushTransport({ ok: false, statusCode: 503, body: { error: "temporarily unavailable" } });
    const provider = new FirebasePushProviderAdapter(
      {
        mode: "staging-real-provider",
        projectId: "easydocument-staging",
        credentialSource: "env-json",
        serviceAccountReference: "FIREBASE_SERVICE_ACCOUNT_JSON",
        timeoutMs: 1000
      },
      transport,
      new StaticFirebaseTokenProvider("firebase-access-token")
    );

    const result = await provider.send({
      notificationId: "notification-id",
      recipientUserId: "user-id",
      type: "TASK_ACCEPTED",
      title: "Task accepted",
      deviceToken: "device-token"
    });

    expect(result).toMatchObject({
      success: false,
      retryable: true,
      statusCode: 503
    });
  });

  it("maps Firebase publish failures to service unavailable", async () => {
    process.env.PUSH_PROVIDER = "firebase";
    process.env.FIREBASE_PROJECT_ID = "easydocument-staging";
    process.env.FIREBASE_SERVICE_ACCOUNT_SECRET_NAME = "easydocument/firebase-service-account";
    const service = new PushService(createPushTransport());

    await expect(
      service.publishPlaceholder({
        notificationId: "notification-id",
        recipientUserId: "user-id",
        type: "TASK_ACCEPTED",
        title: "Task accepted",
        deviceToken: "device-token"
      })
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

function createPushTransport(
  response: { ok: boolean; statusCode: number; body?: unknown } = {
    ok: true,
    statusCode: 200,
    body: { name: "projects/easydocument/messages/message-id" }
  }
): PushHttpTransport & { postJson: jest.Mock } {
  return {
    postJson: jest.fn().mockResolvedValue(response)
  };
}
