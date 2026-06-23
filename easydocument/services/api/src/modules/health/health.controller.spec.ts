import { ServiceUnavailableException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { RedisService } from "../redis/redis.service";
import { StorageService } from "../storage/storage.service";
import { HealthController } from "./health.controller";

function createController(options: { database?: boolean; redis?: boolean; minio?: boolean } = {}) {
  const database = { healthCheck: jest.fn().mockResolvedValue(options.database ?? true) };
  const redis = { healthCheck: jest.fn().mockResolvedValue(options.redis ?? true) };
  const storage = { healthCheck: jest.fn().mockResolvedValue(options.minio ?? true) };
  const controller = new HealthController(
    database as unknown as DatabaseService,
    redis as unknown as RedisService,
    storage as unknown as StorageService
  );
  return { controller, database, redis, storage };
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
});
