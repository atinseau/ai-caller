import { RedisClient } from "bun";
import { inject, injectable } from "inversify";
import { CachePort } from "@/domain/ports/cache.port.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { env } from "@/infrastructure/config/env.ts";

@injectable()
export class RedisCacheAdapter extends CachePort {
  private readonly client: RedisClient;

  constructor(@inject(LoggerPort) private readonly logger: LoggerPort) {
    super();
    this.client = new RedisClient(env.get("REDIS_URL") ?? "", {
      autoReconnect: true,
      enableOfflineQueue: true,
    });
    this.client.onclose = (err) => {
      if (err) {
        this.logger.error(
          { message: err.message } as object,
          "Redis connection closed with error",
        );
      }
    };
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, serialized, "EX", ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch {
      /* graceful degradation — cache write failure is non-critical */
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {
      /* graceful degradation */
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch {
      /* graceful degradation */
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      return await this.client.exists(key);
    } catch {
      return false;
    }
  }
}
