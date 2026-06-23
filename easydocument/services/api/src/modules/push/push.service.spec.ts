import { PushService } from "./push.service";

describe("PushService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PUSH_PROVIDER;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_SECRET_NAME;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
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
  });

  it("represents Firebase with a service-account secret reference", async () => {
    process.env.PUSH_PROVIDER = "firebase";
    process.env.FIREBASE_PROJECT_ID = "easydocument-staging";
    process.env.FIREBASE_SERVICE_ACCOUNT_SECRET_NAME = "easydocument/firebase-service-account";
    const service = new PushService();

    expect(service.getProviderStatus()).toMatchObject({
      mode: "firebase-placeholder",
      providerName: "firebase",
      configured: true,
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
});
