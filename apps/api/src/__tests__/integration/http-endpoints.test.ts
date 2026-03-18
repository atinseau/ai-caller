import {
  describe,
  expect,
  it,
  beforeAll,
  afterAll,
} from "bun:test";
import { app } from "@/interfaces/application";
import { container } from "@/infrastructure/di/container";
import { CompanyUseCase } from "@/application/use-cases/company.use-case";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import { CallServicePort } from "@/domain/services/call-service.port";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
} from "../helpers/setup";

/**
 * HTTP endpoint tests use the PRODUCTION container because the Hono app
 * routes call `container.get()` directly. Data is cleaned up in afterAll.
 */

let mcpUrl: string;
const createdRoomIds: string[] = [];
let testCompanyId: string;

beforeAll(async () => {
  const env = await setupTestEnvironment();
  mcpUrl = env.mcpUrl;

  // Stub CallService in the production container for these tests
  container.rebind(CallServicePort).toConstantValue({
    createCall: async () => ({
      token: `http-test-${Date.now()}-${Math.random()}`,
      expiresAt: new Date(Date.now() + 60_000),
    }),
    terminateCall: async () => {},
  });

  // Create a test company via the production container
  const companyUseCase = container.get(CompanyUseCase);
  const company = await companyUseCase.create({
    name: `http-test-${Date.now()}`,
    mcpUrl,
  });
  testCompanyId = company.id;
});

afterAll(async () => {
  // Cleanup: delete rooms then company
  const roomRepo = container.get(RoomRepositoryPort);
  for (const id of createdRoomIds) {
    await roomRepo.deleteRoom(id).catch(() => {});
  }
  // Delete company via raw prisma
  const { prisma } = await import("@/infrastructure/database/prisma");
  await prisma.company.delete({ where: { id: testCompanyId } }).catch(() => {});
  teardownTestEnvironment();
});

describe("HTTP Endpoints", () => {
  describe("POST /api/v1/company", () => {
    it("should create a company", async () => {
      const res = await app.request("/api/v1/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `http-co-${Date.now()}`,
          mcpUrl: "http://localhost:9999/mcp",
        }),
      });

      expect(res.ok).toBe(true);
      const data = (await res.json()) as { companyId: string };
      expect(data.companyId).toBeDefined();

      // Cleanup
      const { prisma } = await import("@/infrastructure/database/prisma");
      await prisma.company.delete({ where: { id: data.companyId } }).catch(() => {});
    });
  });

  describe("GET /api/v1/company/all", () => {
    it("should return list of companies", async () => {
      const res = await app.request("/api/v1/company/all");

      expect(res.ok).toBe(true);
      const data = (await res.json()) as { companies: unknown[] };
      expect(Array.isArray(data.companies)).toBe(true);
    });
  });

  describe("POST /api/v1/room/create", () => {
    it("should create a TEXT room", async () => {
      const res = await app.request("/api/v1/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: testCompanyId, modality: "TEXT" }),
      });

      expect(res.ok).toBe(true);
      const data = (await res.json()) as { data: { id: string; modality: string } };
      expect(data.data.modality).toBe("TEXT");
      createdRoomIds.push(data.data.id);
    });

    it("should create an AUDIO room by default", async () => {
      const res = await app.request("/api/v1/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: testCompanyId }),
      });

      expect(res.ok).toBe(true);
      const data = (await res.json()) as { data: { modality: string; id: string } };
      expect(data.data.modality).toBe("AUDIO");
      createdRoomIds.push(data.data.id);
    });

    it("should reject invalid companyId format", async () => {
      const res = await app.request("/api/v1/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: "not-a-uuid" }),
      });
      expect(res.ok).toBe(false);
    });

    it("should reject missing body", async () => {
      const res = await app.request("/api/v1/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      expect(res.ok).toBe(false);
    });
  });

  describe("PATCH /api/v1/room/:roomId/attach/:id", () => {
    it("should attach callId to room", async () => {
      // Create room
      const createRes = await app.request("/api/v1/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: testCompanyId, modality: "AUDIO" }),
      });
      const { data: room } = (await createRes.json()) as { data: { id: string } };
      createdRoomIds.push(room.id);

      const res = await app.request(
        `/api/v1/room/${room.id}/attach/call-test-123`,
        { method: "PATCH" },
      );

      expect(res.ok).toBe(true);
      const data = (await res.json()) as { message: string };
      expect(data.message).toContain("attached");
    });
  });

  describe("POST /api/v1/room/:roomId/messages", () => {
    it("should accept a text message", async () => {
      const createRes = await app.request("/api/v1/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: testCompanyId, modality: "TEXT" }),
      });
      const { data: room } = (await createRes.json()) as { data: { id: string } };
      createdRoomIds.push(room.id);

      const res = await app.request(`/api/v1/room/${room.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Bonjour" }),
      });

      expect(res.ok).toBe(true);
      const data = (await res.json()) as { message: string };
      expect(data.message).toBe("Message sent");
    });

    it("should reject empty text", async () => {
      const res = await app.request("/api/v1/room/fake-id/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "" }),
      });
      expect(res.ok).toBe(false);
    });
  });

  describe("GET /api/v1/room/:roomId/stream", () => {
    it("should return SSE content type", async () => {
      const res = await app.request("/api/v1/room/any-room/stream");
      expect(res.ok).toBe(true);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
    });
  });

  describe("404 handling", () => {
    it("should return 404 for unknown routes", async () => {
      const res = await app.request("/api/v1/nonexistent");
      expect(res.status).toBe(404);
    });
  });
});
