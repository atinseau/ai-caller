import { describe, expect, it } from "bun:test";
import { InMemoryCacheAdapter } from "@/infrastructure/cache/in-memory-cache.adapter.ts";

describe("InMemoryCacheAdapter", () => {
  it("should store and retrieve values", async () => {
    const cache = new InMemoryCacheAdapter();
    await cache.set("key1", { name: "test" });
    const result = await cache.get<{ name: string }>("key1");
    expect(result).toEqual({ name: "test" });
  });

  it("should return null for missing keys", async () => {
    const cache = new InMemoryCacheAdapter();
    const result = await cache.get("nonexistent");
    expect(result).toBeNull();
  });

  it("should respect TTL expiration", async () => {
    const cache = new InMemoryCacheAdapter();
    // Set with very short TTL
    await cache.set("expiring", "value", 1);
    // Wait for expiration
    await new Promise((r) => setTimeout(r, 1100));
    const result = await cache.get("expiring");
    expect(result).toBeNull();
  });

  it("should not expire values without TTL", async () => {
    const cache = new InMemoryCacheAdapter();
    await cache.set("permanent", "value");
    const result = await cache.get("permanent");
    expect(result).toBe("value");
  });

  it("should delete by key", async () => {
    const cache = new InMemoryCacheAdapter();
    await cache.set("key1", "value1");
    await cache.delete("key1");
    const result = await cache.get("key1");
    expect(result).toBeNull();
  });

  it("should delete by pattern (prefix match)", async () => {
    const cache = new InMemoryCacheAdapter();
    await cache.set("mcp-tools:url1", ["tool1"]);
    await cache.set("mcp-tools:url2", ["tool2"]);
    await cache.set("contact:123", { id: "123" });

    await cache.deletePattern("mcp-tools:*");

    expect(await cache.get("mcp-tools:url1")).toBeNull();
    expect(await cache.get("mcp-tools:url2")).toBeNull();
    const contact = await cache.get<{ id: string }>("contact:123");
    expect(contact).not.toBeNull();
    expect(contact?.id).toBe("123");
  });

  it("should report existence with has()", async () => {
    const cache = new InMemoryCacheAdapter();
    await cache.set("exists", "yes");

    expect(await cache.has("exists")).toBe(true);
    expect(await cache.has("nope")).toBe(false);
  });

  it("has() should return false for expired keys", async () => {
    const cache = new InMemoryCacheAdapter();
    await cache.set("expiring", "value", 1);
    await new Promise((r) => setTimeout(r, 1100));
    expect(await cache.has("expiring")).toBe(false);
  });

  it("should handle complex objects", async () => {
    const cache = new InMemoryCacheAdapter();
    const tools = [
      {
        type: "function" as const,
        name: "create_ticket",
        description: "Creates a ticket",
        parameters: { type: "object" },
      },
      {
        type: "function" as const,
        name: "get_status",
        description: "Gets status",
        parameters: { type: "object" },
      },
    ];
    await cache.set("mcp-tools:http://localhost:3000", tools, 600);
    const result = await cache.get("mcp-tools:http://localhost:3000");
    expect(result).toEqual(tools);
  });
});
