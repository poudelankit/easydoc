import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { RedisService } from "../redis/redis.service";
import { StorageService } from "../storage/storage.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
    private readonly storage: StorageService
  ) {}

  @Get("live")
  live() {
    return { status: "ok" };
  }

  @Get("ready")
  async ready() {
    const checks = {
      database: false,
      redis: false,
      minio: false
    };

    try {
      checks.database = await this.database.healthCheck();
      checks.redis = await this.redis.healthCheck();
      checks.minio = await this.storage.healthCheck();
    } catch {
      throw new ServiceUnavailableException({ status: "not_ready", checks });
    }

    return { status: "ready", checks };
  }
}
