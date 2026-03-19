import {
  describe,
  expect,
  it,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  setDefaultTimeout,
} from "bun:test";
import { OpenAICallService } from "@/application/services/openai-call.service";
import { CallServicePort } from "@/domain/services/call-service.port";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import { createTestContext } from "@/tests/helpers/test-context";
import {
  createTestCompany,
  setupTestEnvironment,
  teardownTestEnvironment,
} from "@/tests/helpers/setup";

setDefaultTimeout(30_000);

let mcpUrl: string;

beforeAll(async () => {
  const env = await setupTestEnvironment();
  mcpUrl = env.mcpUrl;
});

afterAll(() => teardownTestEnvironment());

const ctx = createTestContext();
beforeEach(ctx.setup);
afterEach(ctx.teardown);

describe("OpenAICallService (real API)", () => {
  describe("createCall", () => {
    it("should create an AUDIO session via clientSecrets", async () => {
      const company = await createTestCompany(ctx.container, mcpUrl);
      const callService = ctx.container.get(CallServicePort);

      const result = await callService.createCall(company, "AUDIO");

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe("string");
      expect(result.token.length).toBeGreaterThan(0);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should create a TEXT session via clientSecrets", async () => {
      const company = await createTestCompany(ctx.container, mcpUrl);
      const callService = ctx.container.get(CallServicePort);

      const result = await callService.createCall(company, "TEXT");

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe("string");
      expect(result.token.length).toBeGreaterThan(0);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("terminateCall", () => {
    it("should return early when room has no callId", async () => {
      const company = await createTestCompany(ctx.container, mcpUrl);
      const roomRepo = ctx.container.get(RoomRepositoryPort);

      const room = await roomRepo.createRoom(
        company.id,
        `terminate-test-${Date.now()}`,
        new Date(Date.now() + 60_000),
        "AUDIO",
      );

      const callService = ctx.container.get(CallServicePort);

      // Should not throw — just logs and returns
      await callService.terminateCall(room);

      // Room should still exist (deleteRoom not called since no callId)
      const found = await roomRepo.findById(room.id);
      expect(found.id).toBe(room.id);
    });

    it("should delete room after successful hangup with valid callId", async () => {
      const company = await createTestCompany(ctx.container, mcpUrl);
      const { token } = await ctx.container
        .get(CallServicePort)
        .createCall(company, "AUDIO");

      const roomRepo = ctx.container.get(RoomRepositoryPort);
      const room = await roomRepo.createRoom(
        company.id,
        token,
        new Date(Date.now() + 60_000),
        "AUDIO",
      );

      const updatedRoom = await roomRepo.updateRoomCallId(
        room.id,
        "fake-call-id-123",
      );

      const callService = ctx.container.get(CallServicePort);

      // hangups with fake callId is silently accepted by OpenAI
      // then deleteRoom is called
      await callService.terminateCall(updatedRoom!);

      // Room should be deleted
      expect(roomRepo.findById(room.id)).rejects.toThrow();
    });
  });
});
