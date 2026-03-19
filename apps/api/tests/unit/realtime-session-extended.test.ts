import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Schema } from "@ai-caller/shared";
import { RealtimeSessionService } from "@/application/services/realtime-session.service.ts";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import type { TextStreamEvent } from "@/domain/ports/text-stream.port.ts";

function createFakes() {
  const publishedEvents: TextStreamEvent[] = [];
  const createdInvokes: unknown[] = [];

  const callService = {
    createCall: mock(() =>
      Promise.resolve({ token: "t", expiresAt: new Date() }),
    ),
    terminateCall: mock(() => Promise.resolve()),
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
    publish: (_roomId: string, event: TextStreamEvent) => {
      publishedEvents.push(event);
    },
    close: mock(() => {
      /* noop */
    }),
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
    textStream,
    publishedEvents,
    createdInvokes,
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

describe("RealtimeSessionService — extended", () => {
  let fakes: ReturnType<typeof createFakes>;

  beforeEach(() => {
    fakes = createFakes();
    fakes.service.initSession(ROOM.id);
  });

  describe("destroySession", () => {
    it("should close the text stream on destroy", () => {
      fakes.service.destroySession(ROOM.id);
      expect(fakes.textStream.close).toHaveBeenCalledWith(ROOM.id);
    });
  });

  describe("unknown message types", () => {
    it("should return empty array for unhandled event types", async () => {
      const events = await fakes.service.processMessage(
        { type: "session.created" } as Schema["RealtimeServerEvent"],
        ROOM,
      );
      expect(events).toHaveLength(0);
    });

    it("should return empty array for response.done", async () => {
      const events = await fakes.service.processMessage(
        { type: "response.done" } as Schema["RealtimeServerEvent"],
        ROOM,
      );
      expect(events).toHaveLength(0);
    });
  });

  describe("mcp_call with JSON string arguments", () => {
    it("should parse string arguments", async () => {
      await fakes.service.processMessage(
        {
          type: "response.output_item.done",
          item: {
            type: "mcp_call",
            id: "mcp-str",
            name: "search",
            arguments: '{"query":"test"}',
            output: "ok",
          },
        } as Schema["RealtimeServerEvent"],
        ROOM,
      );

      expect(fakes.toolRepository.createToolInvoke).toHaveBeenCalled();
      const args = fakes.createdInvokes[0] as unknown[];
      // args[3] should be the parsed arguments
      expect(args[3]).toEqual({ query: "test" });
    });
  });

  describe("mcp_call with object arguments", () => {
    it("should pass object arguments directly", async () => {
      await fakes.service.processMessage(
        {
          type: "response.output_item.done",
          item: {
            type: "mcp_call",
            id: "mcp-obj",
            name: "search",
            arguments: { query: "test" } as unknown as string,
            output: "ok",
          },
        } as unknown as Schema["RealtimeServerEvent"],
        ROOM,
      );

      const args = fakes.createdInvokes[0] as unknown[];
      expect(args[3]).toEqual({ query: "test" });
    });
  });

  describe("mcp_call without id", () => {
    it("should not create tool invoke when item has no id", async () => {
      await fakes.service.processMessage(
        {
          type: "response.output_item.done",
          item: {
            type: "mcp_call",
            name: "search",
            arguments: "{}",
            output: "ok",
          },
        } as Schema["RealtimeServerEvent"],
        ROOM,
      );

      expect(fakes.toolRepository.createToolInvoke).not.toHaveBeenCalled();
    });
  });

  describe("audio_buffer.stopped without shouldCloseCall", () => {
    it("should NOT terminate when shouldCloseCall is false", async () => {
      await fakes.service.processMessage(
        {
          type: "output_audio_buffer.stopped",
        } as Schema["RealtimeServerEvent"],
        ROOM,
      );

      expect(fakes.callService.terminateCall).not.toHaveBeenCalled();
    });
  });

  describe("multiple text deltas", () => {
    it("should publish each delta independently", async () => {
      await fakes.service.processMessage(
        {
          type: "response.output_text.delta",
          delta: "Hel",
        } as Schema["RealtimeServerEvent"],
        ROOM,
      );
      await fakes.service.processMessage(
        {
          type: "response.output_text.delta",
          delta: "lo",
        } as Schema["RealtimeServerEvent"],
        ROOM,
      );

      expect(fakes.publishedEvents).toHaveLength(2);
      expect(fakes.publishedEvents[0]).toEqual({
        type: "text_delta",
        text: "Hel",
      });
      expect(fakes.publishedEvents[1]).toEqual({
        type: "text_delta",
        text: "lo",
      });
    });
  });
});
