import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { RoomUseCase } from "@/application/use-cases/room.use-case.ts";
import { ChatServicePort } from "@/domain/ports/chat-service.port.ts";
import { RealtimeGatewayPort } from "@/domain/ports/realtime-gateway.port.ts";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port.ts";
import { CallServicePort } from "@/domain/services/call-service.port.ts";
import {
  createTestCompany,
  setupTestEnvironment,
  teardownTestEnvironment,
} from "@/tests/helpers/setup";
import { createTestContext } from "@/tests/helpers/test-context";

let mcpUrl: string;

beforeAll(async () => {
  const env = await setupTestEnvironment();
  mcpUrl = env.mcpUrl;
});

afterAll(() => teardownTestEnvironment());

const ctx = createTestContext();
beforeEach(ctx.setup);
afterEach(ctx.teardown);

/** Rebind CallService and ChatService to avoid real OpenAI calls in use-case tests. */
function stubServices() {
  ctx.container.rebind(CallServicePort).toConstantValue({
    createCall: async () => ({
      token: `test-token-${Date.now()}`,
      expiresAt: new Date(Date.now() + 60_000),
    }),
    terminateCall: async () => {
      /* noop */
    },
    buildSessionConfig: async () => ({
      instructions: "test instructions",
      tools: [],
    }),
    buildAudioProviderConfig: async () => ({
      instructions: "test instructions",
      tools: [],
      voice: "marin",
    }),
  });
  ctx.container.rebind(RealtimeGatewayPort).toConstantValue({
    openRoomChannel: async () => {
      /* noop */
    },
    forwardAudioToProvider: () => {
      /* noop */
    },
    sendTextToProvider: () => {
      /* noop */
    },
    closeRoomChannel: () => {
      /* noop */
    },
    registerClientSender: () => {
      /* noop */
    },
    unregisterClientSender: () => {
      /* noop */
    },
  });
  ctx.container.rebind(ChatServicePort).toConstantValue({
    initSession: () => {
      /* noop */
    },
    sendMessage: async function* () {
      /* noop */
    },
    destroySession: () => {
      /* noop */
    },
  });
}

describe("RoomUseCase", () => {
  it("should create a room with AUDIO modality", async () => {
    stubServices();
    const company = await createTestCompany(ctx.container, mcpUrl);
    const useCase = ctx.container.get(RoomUseCase);

    const room = await useCase.createRoom({
      companyId: company.id,
      modality: "AUDIO",
    });

    expect(room.modality).toBe("AUDIO");
    expect(room.companyId).toBe(company.id);
    expect(room.token).toStartWith("audio-");
  });

  it("should create a room with TEXT modality using ChatService", async () => {
    stubServices();
    const company = await createTestCompany(ctx.container, mcpUrl);
    const useCase = ctx.container.get(RoomUseCase);

    const room = await useCase.createRoom({
      companyId: company.id,
      modality: "TEXT",
    });

    expect(room.modality).toBe("TEXT");
    expect(room.token).toStartWith("chat-"); // TEXT rooms use placeholder token
    const roomRepo = ctx.container.get(RoomRepositoryPort);
    const found = await roomRepo.findById(room.id);
    expect(found.id).toBe(room.id);
  });

  it("should throw when company is not found", async () => {
    stubServices();
    const useCase = ctx.container.get(RoomUseCase);

    await expect(
      useCase.createRoom({
        companyId: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow("Company not found");
  });

  it("should attach call ID to room", async () => {
    stubServices();
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
      buildSessionConfig: async () => ({
        instructions: "test",
        tools: [],
      }),
      buildAudioProviderConfig: async () => ({
        instructions: "test",
        tools: [],
        voice: "marin",
      }),
    });
    ctx.container.rebind(RealtimeGatewayPort).toConstantValue({
      openRoomChannel: async () => {
        /* noop */
      },
      forwardAudioToProvider: () => {
        /* noop */
      },
      sendTextToProvider: () => {
        /* noop */
      },
      closeRoomChannel: () => {
        /* noop */
      },
      registerClientSender: () => {
        /* noop */
      },
      unregisterClientSender: () => {
        /* noop */
      },
    });
    ctx.container.rebind(ChatServicePort).toConstantValue({
      initSession: () => {
        /* noop */
      },
      sendMessage: async function* () {
        /* noop */
      },
      destroySession: () => {
        /* noop */
      },
    });

    const company = await createTestCompany(ctx.container, mcpUrl);
    const useCase = ctx.container.get(RoomUseCase);

    // Create an expired room directly via repo (createRoom uses future expiresAt)
    await roomRepo.createRoom(
      company.id,
      `expired-${Date.now()}`,
      new Date(Date.now() - 1000),
      "AUDIO",
      false,
    );

    await useCase.flushExpiredRooms();

    expect(terminateCalled).toBe(true);
    const expired = await roomRepo.findExpiredRooms();
    expect(expired).toHaveLength(0);
  });
});
