import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { writeStructuredLog } from "../../common/logging/structured-logger";
import { RedisService } from "../redis/redis.service";

export interface RateLimitPolicy {
  action: string;
  key: string;
  limit: number;
  windowSeconds: number;
  message?: string;
}

@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  async enforce(policy: RateLimitPolicy) {
    const limit = this.positiveInteger(policy.limit, 1);
    const windowSeconds = this.positiveInteger(policy.windowSeconds, 60);
    const redisKey = `rate:${policy.action}:${policy.key}`;
    const count = await this.redis.incrementWithExpiry(redisKey, windowSeconds);

    writeStructuredLog(count > limit ? "warn" : "debug", "rate_limit.checked", {
      action: policy.action,
      key: policy.key,
      count,
      limit,
      windowSeconds
    });

    if (count > limit) {
      throw new HttpException(
        policy.message ?? "Too many requests. Try again later.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return { count, limit, windowSeconds };
  }

  private positiveInteger(value: number, fallback: number) {
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }
}
