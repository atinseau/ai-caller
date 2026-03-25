import { describe, expect, it, mock } from "bun:test";
import { RoomReadyEvent } from "@/application/events/room-ready.event.ts";
import { RoomReadyHandler } from "@/application/handlers/room-ready.handler.ts";
import { RoomSource } from "@/domain/enums/room-source.enum.ts";

function createMocks(companyOverrides: Record<string, unknown> = {}) {
  const mockRoom = {
    id: "room-1",
    companyId: "c-1",
    token: "tok",
    callId: "call-1",
    modality: "AUDIO" as const,
    expiresAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isTest: false,
    source: RoomSource.WEBRTC,
  };

  const roomRepository = {
    findById: mock(async () => mockRoom),
    createRoom: mock(async () => mockRoom),
    updateRoomCallId: mock(async () => mockRoom),
    findExpiredRooms: mock(async () => []),
    deleteRoom: mock(async () => {
      /* noop */
    }),
  };

  const openRoomChannel = mock(async () => {
    /* noop */
  });
  const realtimeGateway = {
    openRoomChannel,
    forwardAudioToProvider: mock(() => {
      /* noop */
    }),
    sendTextToProvider: mock(() => {
      /* noop */
    }),
    closeRoomChannel: mock(() => {
      /* noop */
    }),
  };

  const subscribeHandler = { fn: null as unknown };
  const eventBus = {
    publish: mock(async () => {
      /* noop */
    }),
    subscribe: mock((_event: unknown, handler: unknown) => {
      subscribeHandler.fn = handler;
    }),
    unsubscribe: mock(() => {
      /* noop */
    }),
  };

  const company = {
    id: "c-1",
    name: "Test",
    mcpUrl: "http://mcp.test",
    language: null,
    vadEagerness: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...companyOverrides,
  };

  const companyRepository = {
    findById: mock(async () => company),
    createCompany: mock(async () => ({})),
    getAllCompanies: mock(async () => []),
  };

  const mockConfig = {
    instructions: "test",
    tools: [],
    voice: "marin",
    mcpUrl: company.mcpUrl ?? undefined,
  };

  const callService = {
    createCall: mock(async () => ({
      token: "tok",
      expiresAt: new Date(),
    })),
    terminateCall: mock(async () => {
      /* noop */
    }),
    buildSessionConfig: mock(async () => ({})),
    buildAudioProviderConfig: mock(async () => mockConfig),
  };

  new RoomReadyHandler(
    roomRepository as never,
    companyRepository as never,
    eventBus as never,
    realtimeGateway as never,
    callService as never,
  );

  return { mockRoom, openRoomChannel, subscribeHandler, callService };
}

describe("RoomReadyHandler — extended", () => {
  it("should build audio provider config and open channel", async () => {
    const { mockRoom, openRoomChannel, subscribeHandler, callService } =
      createMocks({
        language: null,
        vadEagerness: null,
      });

    const event = new RoomReadyEvent(mockRoom);
    await (subscribeHandler.fn as (e: RoomReadyEvent) => Promise<void>)(event);

    expect(callService.buildAudioProviderConfig).toHaveBeenCalled();
    expect(openRoomChannel).toHaveBeenCalled();
  });

  it("should set isTest from room on the config", async () => {
    const { mockRoom, openRoomChannel, subscribeHandler } = createMocks({
      language: "es",
      vadEagerness: "high",
    });

    mockRoom.isTest = true;

    const event = new RoomReadyEvent(mockRoom);
    await (subscribeHandler.fn as (e: RoomReadyEvent) => Promise<void>)(event);

    const [, config] = openRoomChannel.mock.calls[0] as unknown as [
      unknown,
      { isTest: boolean },
    ];
    expect(config.isTest).toBe(true);
  });

  it("should handle company with no mcpUrl", async () => {
    const { mockRoom, openRoomChannel, subscribeHandler } = createMocks({
      mcpUrl: null,
      language: "fr",
      vadEagerness: "low",
    });

    const event = new RoomReadyEvent(mockRoom);
    await (subscribeHandler.fn as (e: RoomReadyEvent) => Promise<void>)(event);

    expect(openRoomChannel).toHaveBeenCalled();
  });
});
