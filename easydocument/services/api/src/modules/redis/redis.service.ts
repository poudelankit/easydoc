import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: 2
  });

  async getClient(): Promise<Redis> {
    if (this.client.status === "wait") {
      await this.client.connect();
    }
    return this.client;
  }

  async incrementWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    const client = await this.getClient();
    const value = await client.incr(key);
    if (value === 1) {
      await client.expire(key, ttlSeconds);
    }
    return value;
  }

  async healthCheck(): Promise<boolean> {
    const client = await this.getClient();
    return (await client.ping()) === "PONG";
  }

  async onModuleDestroy() {
    if (this.client.status !== "end") {
      this.client.disconnect();
    }
  }
}
