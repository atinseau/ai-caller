import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { RoomEventRepositoryPort } from "@/domain/repositories/room-event-repository.port";
import type { PrismaClient } from "@/generated/prisma/client";
import { PRISMA_TOKEN } from "@/infrastructure/database/prisma";
import {
  createTestCompany,
  mockMcpServer,
  setupTestEnvironment,
  teardownTestEnvironment,
} from "@/tests/helpers/setup";
import { createTestContext } from "@/tests/helpers/test-context";

const ctx = createTestContext();

beforeEach(async () => {
  await setupTestEnvironment();
  await ctx.setup();
});

afterEach(async () => {
  await ctx.teardown();
  teardownTestEnvironment();
});

function getTxPrisma() {
  return ctx.container.get<PrismaClient>(PRISMA_TOKEN as never);
}

async function createTestRoom(companyId: string) {
  return getTxPrisma().room.create({
    data: {
      token: `token-${Date.now()}-${Math.random()}`,
      companyId,
      expiresAt: new Date(Date.now() + 60_000),
      modality: "TEXT",
      isTest: false,
    },
  });
}

describe("RoomEventRepositoryPrisma", () => {
  it("creates a RoomEvent and returns it with correct fields", async () => {
    const company = await createTestCompany(ctx.container, mockMcpServer.url);
    const room = await createTestRoom(company.id);
    const repo = ctx.container.get(RoomEventRepositoryPort);

    const event = await repo.create(room.id, "USER_TRANSCRIPT", {
      transcript: "Hello",
    });

    expect(event.id).toBeDefined();
    expect(event.roomId).toBe(room.id);
    expect(event.type).toBe("USER_TRANSCRIPT");
    expect(event.payload).toMatchObject({ transcript: "Hello" });
    expect(event.createdAt).toBeInstanceOf(Date);
  });

  it("findByRoomId returns events in ascending createdAt order", async () => {
    const company = await createTestCompany(ctx.container, mockMcpServer.url);
    const room = await createTestRoom(company.id);
    const repo = ctx.container.get(RoomEventRepositoryPort);

    await repo.create(room.id, "USER_TRANSCRIPT", { transcript: "First" });
    await repo.create(room.id, "AGENT_TRANSCRIPT", { transcript: "Second" });
    await repo.create(room.id, "TOOL_INVOKE_CREATED", { toolName: "search" });

    const events = await repo.findByRoomId(room.id);

    expect(events).toHaveLength(3);
    expect(events[0]?.type).toBe("USER_TRANSCRIPT");
    expect(events[1]?.type).toBe("AGENT_TRANSCRIPT");
    expect(events[2]?.type).toBe("TOOL_INVOKE_CREATED");
  });

  it("findByRoomId returns empty array for unknown roomId", async () => {
    const repo = ctx.container.get(RoomEventRepositoryPort);
    const events = await repo.findByRoomId(
      "00000000-0000-0000-0000-000000000000",
    );
    expect(events).toEqual([]);
  });

  it("stores and retrieves complex payload correctly", async () => {
    const company = await createTestCompany(ctx.container, mockMcpServer.url);
    const room = await createTestRoom(company.id);
    const repo = ctx.container.get(RoomEventRepositoryPort);

    const payload = {
      toolName: "search_customer",
      args: { name: "John" },
      status: "RUNNING",
      invokeId: "abc-123",
    };

    await repo.create(room.id, "TOOL_INVOKE_CREATED", payload);
    const [event] = await repo.findByRoomId(room.id);

    expect(event?.payload).toMatchObject(payload);
  });

  it("scopes results to the given roomId only", async () => {
    const company = await createTestCompany(ctx.container, mockMcpServer.url);
    const room1 = await createTestRoom(company.id);
    const room2 = await createTestRoom(company.id);
    const repo = ctx.container.get(RoomEventRepositoryPort);

    await repo.create(room1.id, "TEXT_DELTA", { delta: "a" });
    await repo.create(room2.id, "TEXT_DELTA", { delta: "b" });

    const room1Events = await repo.findByRoomId(room1.id);
    const room2Events = await repo.findByRoomId(room2.id);

    expect(room1Events).toHaveLength(1);
    expect(room2Events).toHaveLength(1);
    expect(room1Events[0]?.payload).toMatchObject({ delta: "a" });
    expect(room2Events[0]?.payload).toMatchObject({ delta: "b" });
  });
});
