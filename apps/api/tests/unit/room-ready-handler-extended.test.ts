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
    sendToRoom: mock(() => {
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

  const companyRepository = {
    findById: mock(async () => ({
      id: "c-1",
      name: "Test",
      mcpUrl: "http://mcp.test",
      language: null,
      vadEagerness: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...companyOverrides,
    })),
    createCompany: mock(async () => ({})),
    getAllCompanies: mock(async () => []),
  };

  new RoomReadyHandler(
    roomRepository as never,
    companyRepository as never,
    eventBus as never,
    realtimeGateway as never,
  );

  return { mockRoom, openRoomChannel, subscribeHandler };
}

describe("RoomReadyHandler — extended", () => {
  it("should pass undefined for null language and vadEagerness", async () => {
    const { mockRoom, openRoomChannel, subscribeHandler } = createMocks({
      language: null,
      vadEagerness: null,
    });

    const event = new RoomReadyEvent(mockRoom);
    await (subscribeHandler.fn as (e: RoomReadyEvent) => Promise<void>)(event);

    expect(openRoomChannel).toHaveBeenCalledWith(
      mockRoom,
      "http://mcp.test",
      false,
      undefined,
      undefined,
    );
  });

  it("should pass company language and vadEagerness when set", async () => {
    const { mockRoom, openRoomChannel, subscribeHandler } = createMocks({
      language: "es",
      vadEagerness: "high",
    });

    const event = new RoomReadyEvent(mockRoom);
    await (subscribeHandler.fn as (e: RoomReadyEvent) => Promise<void>)(event);

    expect(openRoomChannel).toHaveBeenCalledWith(
      mockRoom,
      "http://mcp.test",
      false,
      "es",
      "high",
    );
  });

  it("should pass undefined mcpUrl when company has no mcpUrl", async () => {
    const { mockRoom, openRoomChannel, subscribeHandler } = createMocks({
      mcpUrl: null,
      language: "fr",
      vadEagerness: "low",
    });

    const event = new RoomReadyEvent(mockRoom);
    await (subscribeHandler.fn as (e: RoomReadyEvent) => Promise<void>)(event);

    expect(openRoomChannel).toHaveBeenCalledWith(
      mockRoom,
      undefined,
      false,
      "fr",
      "low",
    );
  });
});
