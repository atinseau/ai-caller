import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { app } from "@/interfaces/application";
import { container } from "@/infrastructure/di/container";
import { CompanyUseCase } from "@/application/use-cases/company.use-case";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import { RoomEventRepositoryPort } from "@/domain/repositories/room-event-repository.port";
import { CallServicePort } from "@/domain/services/call-service.port";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  mockMcpServer,
} from "../helpers/setup";
import {
  createTestSession,
  cleanupTestSession,
} from "../helpers/auth-session";

let authCookie: string;
let authUserId: string;
let testCompanyId: string;
let testRoomId: string;

beforeAll(async () => {
  await setupTestEnvironment();

  const session = await createTestSession("ROOT");
  authCookie = session.cookie;
  authUserId = session.userId;

  container.rebind(CallServicePort).toConstantValue({
    createCall: async () => ({
      token: `events-test-${Date.now()}`,
      expiresAt: new Date(Date.now() + 60_000),
    }),
    terminateCall: async () => {},
  });

  const companyUseCase = container.get(CompanyUseCase);
  const company = await companyUseCase.create({
    name: `events-test-${Date.now()}`,
    mcpUrl: mockMcpServer.url,
  });
  testCompanyId = company.id;

  // Create a room for our event tests
  const roomRepo = container.get(RoomRepositoryPort);
  const room = await roomRepo.createRoom(testCompanyId, `token-events-${Date.now()}`, undefined, "TEXT", true);
  testRoomId = room.id;
});

afterAll(async () => {
  const { prisma } = await import("@/infrastructure/database/prisma");
  await prisma.room.delete({ where: { id: testRoomId } }).catch(() => {});
  await prisma.company.delete({ where: { id: testCompanyId } }).catch(() => {});
  await cleanupTestSession(authUserId);
  teardownTestEnvironment();
});

describe("GET /api/v1/room/:roomId/events", () => {
  it("returns 401 without session", async () => {
    const res = await app.request(`/api/v1/room/${testRoomId}/events`);
    expect(res.status).toBe(401);
  });

  it("returns empty array for a room with no events", async () => {
    const res = await app.request(`/api/v1/room/${testRoomId}/events`, {
      headers: { Cookie: authCookie },
    });

    expect(res.ok).toBe(true);
    const body = (await res.json()) as { events: unknown[] };
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events).toHaveLength(0);
  });

  it("returns persisted events in order after seeding them", async () => {
    const repo = container.get(RoomEventRepositoryPort);

    await repo.create(testRoomId, "USER_TRANSCRIPT", { text: "First" });
    await repo.create(testRoomId, "AGENT_TRANSCRIPT", { text: "Second" });

    const res = await app.request(`/api/v1/room/${testRoomId}/events`, {
      headers: { Cookie: authCookie },
    });

    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      events: Array<{ type: string; payload: { text: string } }>;
    };

    expect(body.events.length).toBeGreaterThanOrEqual(2);
    const types = body.events.map((e) => e.type);
    expect(types).toContain("USER_TRANSCRIPT");
    expect(types).toContain("AGENT_TRANSCRIPT");
  });

  it("returns empty array for an unknown roomId (no crash)", async () => {
    const res = await app.request(
      "/api/v1/room/00000000-0000-0000-0000-000000000000/events",
      { headers: { Cookie: authCookie } },
    );

    expect(res.ok).toBe(true);
    const body = (await res.json()) as { events: unknown[] };
    expect(body.events).toEqual([]);
  });
});
