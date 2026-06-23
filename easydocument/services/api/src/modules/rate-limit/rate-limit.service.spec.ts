import { HttpException } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";
import { RateLimitService } from "./rate-limit.service";

describe("RateLimitService", () => {
  it("allows requests within the policy limit", async () => {
    const redis = { incrementWithExpiry: jest.fn().mockResolvedValue(2) };
    const service = new RateLimitService(redis as unknown as RedisService);

    await expect(
      service.enforce({ action: "message_send", key: "user-id", limit: 3, windowSeconds: 60 })
    ).resolves.toEqual({ count: 2, limit: 3, windowSeconds: 60 });
  });

  it("rejects requests above the policy limit", async () => {
    const redis = { incrementWithExpiry: jest.fn().mockResolvedValue(6) };
    const service = new RateLimitService(redis as unknown as RedisService);

    await expect(
      service.enforce({ action: "otp_verify", key: "phone", limit: 5, windowSeconds: 600 })
    ).rejects.toBeInstanceOf(HttpException);
  });
});
