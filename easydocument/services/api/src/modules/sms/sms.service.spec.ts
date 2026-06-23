import { SmsService } from "./sms.service";

describe("SmsService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SMS_PROVIDER;
    delete process.env.SMS_PROVIDER_API_KEY;
    delete process.env.SMS_PROVIDER_SENDER_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("keeps local mock OTP behavior for local development", async () => {
    process.env.SMS_PROVIDER = "local-mock";
    const service = new SmsService();

    await expect(service.sendOtp({ phoneNumber: "+9779800000000", purpose: "LOGIN" })).resolves.toMatchObject({
      otp: "123456",
      providerMode: "local-mock"
    });
  });

  it("uses a production provider placeholder without exposing credentials", async () => {
    process.env.SMS_PROVIDER = "real-sms-provider";
    process.env.SMS_PROVIDER_API_KEY = "provider-key";
    process.env.SMS_PROVIDER_SENDER_ID = "EasyDoc";
    const service = new SmsService();

    const result = await service.sendOtp({ phoneNumber: "+9779800000000", purpose: "LOGIN" });

    expect(result.providerMode).toBe("provider-placeholder");
    expect(result.providerName).toBe("real-sms-provider");
    expect(result.otp).toMatch(/^\d{6}$/);
    expect(result.otp).not.toBe("123456");
    expect(service.getProviderStatus()).toMatchObject({ configured: true });
  });
});
