import { ServiceUnavailableException } from "@nestjs/common";
import { HttpSmsProviderAdapter, SmsHttpTransport, SmsService } from "./sms.service";

describe("SmsService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NODE_ENV;
    delete process.env.SMS_PROVIDER;
    delete process.env.SMS_PROVIDER_ENDPOINT;
    delete process.env.SMS_PROVIDER_API_KEY;
    delete process.env.SMS_PROVIDER_SENDER_ID;
    delete process.env.SMS_PROVIDER_TIMEOUT_MS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("keeps local mock OTP behavior for local development", async () => {
    process.env.SMS_PROVIDER = "local-mock";
    const service = new SmsService();

    await expect(service.sendOtp({ phoneNumber: "+9779800000000", purpose: "LOGIN" })).resolves.toMatchObject({
      otp: "123456",
      providerMode: "local-mock",
      providerName: "local-mock"
    });
    expect(service.getProviderStatus()).toMatchObject({
      mode: "local-mock",
      configured: true
    });
  });

  it("selects staging real-provider mode when configured in staging", async () => {
    process.env.NODE_ENV = "staging";
    process.env.SMS_PROVIDER = "real-sms-provider";
    process.env.SMS_PROVIDER_ENDPOINT = "https://sms-provider.example/send";
    process.env.SMS_PROVIDER_API_KEY = "provider-key";
    process.env.SMS_PROVIDER_SENDER_ID = "EasyDoc";
    const transport = createSmsTransport({ ok: true, statusCode: 202, body: { messageId: "sms-1" } });
    const service = new SmsService(transport);

    const result = await service.sendOtp({ phoneNumber: "+9779800000000", purpose: "LOGIN" });

    expect(result.providerMode).toBe("staging-real-provider");
    expect(result.providerName).toBe("real-sms-provider");
    expect(result.otp).toMatch(/^\d{6}$/);
    expect(result.otp).not.toBe("123456");
    expect(transport.postJson).toHaveBeenCalledTimes(1);
  });

  it("selects production real-provider mode when configured in production", () => {
    process.env.NODE_ENV = "production";
    process.env.SMS_PROVIDER = "real-sms-provider";
    process.env.SMS_PROVIDER_ENDPOINT = "https://sms-provider.example/send";
    process.env.SMS_PROVIDER_API_KEY = "provider-key";
    process.env.SMS_PROVIDER_SENDER_ID = "EasyDoc";
    const service = new SmsService(createSmsTransport());

    expect(service.getProviderStatus()).toMatchObject({
      mode: "production-real-provider",
      providerName: "real-sms-provider",
      configured: true,
      endpointConfigured: true,
      senderConfigured: true
    });
  });

  it("uses provider-placeholder mode outside production-like environments", () => {
    process.env.NODE_ENV = "development";
    process.env.SMS_PROVIDER = "real-sms-provider";
    process.env.SMS_PROVIDER_ENDPOINT = "https://sms-provider.example/send";
    process.env.SMS_PROVIDER_API_KEY = "provider-key";
    process.env.SMS_PROVIDER_SENDER_ID = "EasyDoc";
    const service = new SmsService(createSmsTransport());

    expect(service.getProviderStatus()).toMatchObject({
      mode: "provider-placeholder",
      configured: true
    });
  });

  it("sends OTP through the HTTP adapter with a mocked transport", async () => {
    const transport = createSmsTransport({ ok: true, statusCode: 202, body: { message_id: "provider-message-id" } });
    const adapter = new HttpSmsProviderAdapter(
      {
        providerName: "real-sms-provider",
        mode: "staging-real-provider",
        endpoint: "https://sms-provider.example/send",
        apiKey: "provider-key",
        senderId: "EasyDoc",
        timeoutMs: 1000
      },
      transport
    );

    const result = await adapter.sendOtp({
      phoneNumber: "+9779800000000",
      purpose: "LOGIN",
      otp: "654321"
    });

    expect(result).toMatchObject({
      success: true,
      providerName: "real-sms-provider",
      providerMode: "staging-real-provider",
      providerMessageId: "provider-message-id",
      retryable: false
    });
    expect(transport.postJson).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://sms-provider.example/send",
        headers: expect.objectContaining({
          Authorization: "Bearer provider-key",
          "X-Sender-Id": "EasyDoc"
        }),
        body: expect.objectContaining({
          to: "+9779800000000",
          senderId: "EasyDoc",
          purpose: "LOGIN"
        })
      })
    );
  });

  it("fails safely when the real SMS provider is not configured", async () => {
    process.env.NODE_ENV = "staging";
    process.env.SMS_PROVIDER = "real-sms-provider";
    process.env.SMS_PROVIDER_API_KEY = "provider-key";
    process.env.SMS_PROVIDER_SENDER_ID = "EasyDoc";
    const service = new SmsService(createSmsTransport());

    await expect(service.sendOtp({ phoneNumber: "+9779800000000", purpose: "LOGIN" })).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );
  });

  it("maps retryable provider failures to service unavailable", async () => {
    process.env.NODE_ENV = "staging";
    process.env.SMS_PROVIDER = "real-sms-provider";
    process.env.SMS_PROVIDER_ENDPOINT = "https://sms-provider.example/send";
    process.env.SMS_PROVIDER_API_KEY = "provider-key";
    process.env.SMS_PROVIDER_SENDER_ID = "EasyDoc";
    const transport = createSmsTransport({ ok: false, statusCode: 503, body: { error: "temporarily unavailable" } });
    const service = new SmsService(transport);

    await expect(service.sendOtp({ phoneNumber: "+9779800000000", purpose: "LOGIN" })).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );
  });
});

function createSmsTransport(
  response: { ok: boolean; statusCode: number; body?: unknown } = {
    ok: true,
    statusCode: 202,
    body: { messageId: "sms-message-id" }
  }
): SmsHttpTransport & { postJson: jest.Mock } {
  return {
    postJson: jest.fn().mockResolvedValue(response)
  };
}
