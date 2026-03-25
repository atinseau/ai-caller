export abstract class CachePort {
  abstract get<T>(key: string): Promise<T | null>;
  abstract set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract deletePattern(pattern: string): Promise<void>;
  abstract has(key: string): Promise<boolean>;
}
