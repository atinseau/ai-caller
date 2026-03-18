import { describe, expect, it, beforeAll, beforeEach, afterAll, afterEach } from "bun:test";
import { RoomUseCase } from "@/application/use-cases/room.use-case";
import { CallServicePort } from "@/domain/services/call-service.port";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import { createTestContext } from "../helpers/test-context";
import {
  createTestCompany,
  setupTestEnvironment,
  teardownTestEnvironment,
} from "../helpers/setup";

let mcpUrl: string;

beforeAll(async () => {
  const env = await setupTestEnvironment();
  mcpUrl = env.mcpUrl;
});

afterAll(() => teardownTestEnvironment());

const ctx = createTestContext();
beforeEach(ctx.setup);
afterEach(ctx.teardown);

/** Rebind CallService to avoid real OpenAI calls in use-case tests. */
function stubCallService() {
  ctx.container.rebind(CallServicePort).toConstantValue({
    createCall: async () => ({
      token: `test-token-${Date.now()}`,
      expiresAt: new Date(Date.now() + 60_000),
    }),
    terminateCall: async () => {},
  });
}

describe("RoomUseCase", () => {
  it("should create a room with AUDIO modality", async () => {
    stubCallService();
    const company = await createTestCompany(ctx.container, mcpUrl);
    const useCase = ctx.container.get(RoomUseCase);

    const room = await useCase.createRoom({
      companyId: company.id,
      modality: "AUDIO",
    });

    expect(room.modality).toBe("AUDIO");
    expect(room.companyId).toBe(company.id);
    expect(room.token).toContain("test-token-");
  });

  it("should create a room with TEXT modality and persist it", async () => {
    stubCallService();
    const company = await createTestCompany(ctx.container, mcpUrl);
    const useCase = ctx.container.get(RoomUseCase);

    const room = await useCase.createRoom({
      companyId: company.id,
      modality: "TEXT",
    });

    expect(room.modality).toBe("TEXT");
    const roomRepo = ctx.container.get(RoomRepositoryPort);
    const found = await roomRepo.findById(room.id);
    expect(found.id).toBe(room.id);
  });

  it("should throw when company is not found", async () => {
    stubCallService();
    const useCase = ctx.container.get(RoomUseCase);

    expect(
      useCase.createRoom({
        companyId: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow("Company not found");
  });

  it("should attach call ID to room", async () => {
    stubCallService();
    const company = await createTestCompany(ctx.container, mcpUrl);
    const useCase = ctx.container.get(RoomUseCase);

    const room = await useCase.createRoom({
      companyId: company.id,
      modality: "AUDIO",
    });

    await useCase.attachCallToRoom({ roomId: room.id, id: "call-123" });

    const roomRepo = ctx.container.get(RoomRepositoryPort);
    const updated = await roomRepo.findById(room.id);
    expect(updated.callId).toBe("call-123");
  });

  it("should flush expired rooms", async () => {
    let terminateCalled = false;
    const roomRepo = ctx.container.get(RoomRepositoryPort);

    ctx.container.rebind(CallServicePort).toConstantValue({
      createCall: async () => ({
        token: `test-token-expired-${Date.now()}`,
        expiresAt: new Date(Date.now() - 1000),
      }),
      terminateCall: async (room: { id: string }) => {
        terminateCalled = true;
        await roomRepo.deleteRoom(room.id);
      },
    });

    const company = await createTestCompany(ctx.container, mcpUrl);
    const useCase = ctx.container.get(RoomUseCase);

    await useCase.createRoom({ companyId: company.id, modality: "AUDIO" });
    await useCase.flushExpiredRooms();

    expect(terminateCalled).toBe(true);
    const expired = await roomRepo.findExpiredRooms();
    expect(expired).toHaveLength(0);
  });
});
