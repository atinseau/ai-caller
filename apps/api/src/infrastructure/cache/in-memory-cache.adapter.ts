import { injectable } from "inversify";
import { CachePort } from "@/domain/ports/cache.port.ts";

type CacheEntry = {
  value: unknown;
  expiresAt: number | null;
};

@injectable()
export class InMemoryCacheAdapter extends CachePort {
  private readonly store: Map<string, CacheEntry> = new Map();

  // biome-ignore lint/suspicious/useAwait: must match async CachePort interface
  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  // biome-ignore lint/suspicious/useAwait: must match async CachePort interface
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  // biome-ignore lint/suspicious/useAwait: must match async CachePort interface
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  // biome-ignore lint/suspicious/useAwait: must match async CachePort interface
  async deletePattern(pattern: string): Promise<void> {
    const prefix = pattern.replace(/\*$/u, "");
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  // biome-ignore lint/suspicious/useAwait: must match async CachePort interface
  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }
}
