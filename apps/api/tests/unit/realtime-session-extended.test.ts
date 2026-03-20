import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Schema } from "@ai-caller/shared";
import { RealtimeSessionService } from "@/application/services/realtime-session.service.ts";
import { RoomSource } from "@/domain/enums/room-source.enum.ts";
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
  source: RoomSource.WEBRTC,
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
