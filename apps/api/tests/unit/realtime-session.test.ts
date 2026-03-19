import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Schema } from "@ai-caller/shared";
import { RealtimeSessionService } from "@/application/services/realtime-session.service.ts";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import type { TextStreamEvent } from "@/domain/ports/text-stream.port.ts";

// Lightweight fakes for ports (no mocking framework needed)
function createFakes() {
  const publishedEvents: { roomId: string; event: TextStreamEvent }[] = [];
  const createdInvokes: unknown[] = [];
  let terminateCalled = false;

  const callService = {
    createCall: mock(() =>
      Promise.resolve({ token: "t", expiresAt: new Date() }),
    ),
    terminateCall: mock(() => {
      terminateCalled = true;
      return Promise.resolve();
    }),
  };

  const toolRepository = {
    createToolInvoke: mock((...args: unknown[]) => {
      createdInvokes.push(args);
      return Promise.resolve({
        id: "inv-1",
        entityId: "e-1",
        roomId: "r-1",
        status: "RUNNING",
        createdAt: new Date(),
      });
    }),
    completeToolInvokeByEntityId: mock(() => Promise.resolve({})),
    failToolInvoke: mock(() => Promise.resolve({})),
    findByEntityId: mock(() => Promise.resolve(null)),
    findActiveByRoomId: mock(() => Promise.resolve([])),
  };

  const logger = {
    info: () => {
      /* noop */
    },
    error: () => {
      /* noop */
    },
    warn: () => {
      /* noop */
    },
  };

  const textStream = {
    subscribe: () => ({}),
    publish: (roomId: string, event: TextStreamEvent) => {
      publishedEvents.push({ roomId, event });
    },
    close: () => {
      /* noop */
    },
  };

  const subAgent = { execute: mock(() => Promise.resolve({})) };

  const roomEventRepository = {
    create: mock(() => Promise.resolve({})),
    findByRoomId: mock(() => Promise.resolve([])),
  };

  const service = new RealtimeSessionService(
    callService as never,
    toolRepository as never,
    roomEventRepository as never,
    logger as never,
    textStream as never,
    subAgent as never,
  );

  return {
    service,
    callService,
    toolRepository,
    publishedEvents,
    createdInvokes,
    get terminateCalled() {
      return terminateCalled;
    },
  };
}

const ROOM: IRoomModel = {
  id: "room-1",
  companyId: "company-1",
  token: "tok",
  callId: "call-1",
  expiresAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  modality: "TEXT",
  isTest: false,
};

describe("RealtimeSessionService", () => {
  let fakes: ReturnType<typeof createFakes>;

  beforeEach(() => {
    fakes = createFakes();
    fakes.service.initSession(ROOM.id);
  });

  describe("text events", () => {
    it("should publish text_delta on response.output_text.delta", async () => {
      const events = await fakes.service.processMessage(
        {
          type: "response.output_text.delta",
          delta: "Hello ",
        } as Schema["RealtimeServerEvent"],
        ROOM,
      );

      expect(events).toHaveLength(0); // no client events to send back
      expect(fakes.publishedEvents).toHaveLength(1);
      expect(fakes.publishedEvents[0]?.event).toEqual({
        type: "text_delta",
        text: "Hello ",
      });
    });

    it("should publish text_done on response.output_text.done", async () => {
      await fakes.service.processMessage(
        {
          type: "response.output_text.done",
          text: "Hello world",
        } as Schema["RealtimeServerEvent"],
        ROOM,
      );

      expect(fakes.publishedEvents[0]?.event).toEqual({
        type: "text_done",
        text: "Hello world",
      });
    });
  });

  describe("function calls", () => {
    it("should set shouldCloseCall on CALL_CLOSE function call", async () => {
      const events = await fakes.service.processMessage(
        {
          type: "response.output_item.done",
          item: {
            type: "function_call",
            id: "fc-1",
            status: "completed",
            name: "close_call",
          },
        } as Schema["RealtimeServerEvent"],
        ROOM,
      );

      // Should return unblock messages
      expect(events.length).toBeGreaterThan(0);

      // Now audio buffer stopped should trigger terminate
      await fakes.service.processMessage(
        {
          type: "output_audio_buffer.stopped",
        } as Schema["RealtimeServerEvent"],
        ROOM,
      );

      expect(fakes.terminateCalled).toBe(true);
    });

    it("should warn on function call with non-completed status", async () => {
      const events = await fakes.service.processMessage(
        {
          type: "response.output_item.done",
          item: {
            type: "function_call",
            id: "fc-2",
            status: "in_progress",
          },
        } as Schema["RealtimeServerEvent"],
        ROOM,
      );

      expect(events).toHaveLength(0);
    });
  });

  describe("mcp calls", () => {
    it("should create tool invoke and return unblock messages", async () => {
      const events = await fakes.service.processMessage(
        {
          type: "response.output_item.done",
          item: {
            type: "mcp_call",
            id: "mcp-1",
            name: "search_customer",
            arguments: '{"name":"John"}',
            output: "result",
          },
        } as Schema["RealtimeServerEvent"],
        ROOM,
      );

      expect(fakes.toolRepository.createToolInvoke).toHaveBeenCalled();
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe("lifecycle", () => {
    it("should init and destroy session state", () => {
      // Already init'd in beforeEach
      fakes.service.destroySession(ROOM.id);

      // After destroy, audio buffer stopped should NOT trigger terminate
      fakes.service.processMessage(
        {
          type: "output_audio_buffer.stopped",
        } as Schema["RealtimeServerEvent"],
        ROOM,
      );

      expect(fakes.terminateCalled).toBe(false);
    });
  });
});
