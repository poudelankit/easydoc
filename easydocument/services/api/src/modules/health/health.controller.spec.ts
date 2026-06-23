import { ServiceUnavailableException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { PushService } from "../push/push.service";
import { RedisService } from "../redis/redis.service";
import { SmsService } from "../sms/sms.service";
import { StorageService } from "../storage/storage.service";
import { HealthController } from "./health.controller";

function createController(options: { database?: boolean; redis?: boolean; minio?: boolean } = {}) {
  const database = { healthCheck: jest.fn().mockResolvedValue(options.database ?? true) };
  const redis = { healthCheck: jest.fn().mockResolvedValue(options.redis ?? true) };
  const storage = { healthCheck: jest.fn().mockResolvedValue(options.minio ?? true) };
  const sms = { getProviderStatus: jest.fn().mockReturnValue({ mode: "local-mock", configured: true }) };
  const push = { getProviderStatus: jest.fn().mockReturnValue({ mode: "placeholder", configured: true }) };
  const controller = new HealthController(
    database as unknown as DatabaseService,
    redis as unknown as RedisService,
    storage as unknown as StorageService,
    sms as unknown as SmsService,
    push as unknown as PushService
  );
  return { controller, database, redis, storage, sms, push };
}

describe("HealthController", () => {
  it("returns component readiness details", async () => {
    const { controller } = createController();

    await expect(controller.ready()).resolves.toMatchObject({
      status: "ready",
      checks: {
        database: { status: "ok" },
        redis: { status: "ok" },
        minio: { status: "ok" }
      }
    });
  });

  it("returns service unavailable when a dependency is not ready", async () => {
    const { controller } = createController({ redis: false });

    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("returns provider readiness details", () => {
    const { controller } = createController();

    expect(controller.otpProviderHealth()).toMatchObject({
      status: "ready",
      checks: {
        otp_provider: { mode: "local-mock", status: "ok" }
      }
    });
    expect(controller.pushProviderHealth()).toMatchObject({
      status: "ready",
      checks: {
        push_provider: { mode: "placeholder", status: "ok" }
      }
    });
  });

  it("rejects provider readiness when delivery provider config is incomplete", () => {
    const { controller, sms } = createController();
    sms.getProviderStatus.mockReturnValue({
      mode: "staging-real-provider",
      providerName: "real-sms-provider",
      configured: false
    });

    expect(() => controller.otpProviderHealth()).toThrow(ServiceUnavailableException);
  });
});
