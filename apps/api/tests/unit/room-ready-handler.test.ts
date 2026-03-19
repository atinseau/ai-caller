import { describe, expect, it, mock } from "bun:test";
import { RoomReadyEvent } from "@/application/events/room-ready.event.ts";
import { RoomReadyHandler } from "@/application/handlers/room-ready.handler.ts";

describe("RoomReadyHandler", () => {
  it("should fetch room and open gateway channel on RoomReadyEvent", async () => {
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
        createdAt: new Date(),
        updatedAt: new Date(),
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

    expect(eventBus.subscribe).toHaveBeenCalledTimes(1);

    // Simulate event dispatch
    const event = new RoomReadyEvent(mockRoom);
    await (subscribeHandler.fn as (e: RoomReadyEvent) => Promise<void>)(event);

    expect(roomRepository.findById).toHaveBeenCalledWith("room-1");
    expect(openRoomChannel).toHaveBeenCalledWith(mockRoom, "http://mcp.test");
  });
});
