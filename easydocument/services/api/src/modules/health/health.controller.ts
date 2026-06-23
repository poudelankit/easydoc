import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { RedisService } from "../redis/redis.service";
import { StorageService } from "../storage/storage.service";

type ComponentName = "database" | "redis" | "minio";

interface HealthComponent {
  status: "ok" | "error";
  latencyMs: number;
  error?: string;
}

@Controller("health")
export class HealthController {
  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
    private readonly storage: StorageService
  ) {}

  @Get("live")
  live() {
    return {
      status: "ok",
      service: "easydocument-api",
      timestamp: new Date().toISOString()
    };
  }

  @Get("ready")
  async ready() {
    const checks = {
      database: await this.checkComponent("database", () => this.database.healthCheck()),
      redis: await this.checkComponent("redis", () => this.redis.healthCheck()),
      minio: await this.checkComponent("minio", () => this.storage.healthCheck())
    };

    const ready = Object.values(checks).every((check) => check.status === "ok");
    const payload = {
      status: ready ? "ready" : "not_ready",
      service: "easydocument-api",
      timestamp: new Date().toISOString(),
      checks
    };

    if (!ready) {
      throw new ServiceUnavailableException(payload);
    }

    return payload;
  }

  @Get("database")
  async databaseHealth() {
    return this.singleComponent("database", () => this.database.healthCheck());
  }

  @Get("redis")
  async redisHealth() {
    return this.singleComponent("redis", () => this.redis.healthCheck());
  }

  @Get("minio")
  async minioHealth() {
    return this.singleComponent("minio", () => this.storage.healthCheck());
  }

  private async singleComponent(name: ComponentName, check: () => Promise<boolean>) {
    const component = await this.checkComponent(name, check);
    const payload = {
      status: component.status === "ok" ? "ready" : "not_ready",
      service: "easydocument-api",
      timestamp: new Date().toISOString(),
      checks: { [name]: component }
    };

    if (component.status !== "ok") {
      throw new ServiceUnavailableException(payload);
    }
    return payload;
  }

  private async checkComponent(
    _name: ComponentName,
    check: () => Promise<boolean>
  ): Promise<HealthComponent> {
    const startedAt = Date.now();
    try {
      const healthy = await check();
      return {
        status: healthy ? "ok" : "error",
        latencyMs: Date.now() - startedAt
      };
    } catch (error) {
      return {
        status: "error",
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
