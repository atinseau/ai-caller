import { beforeEach, describe, expect, it, mock } from "bun:test";
import { RealtimeSessionService } from "@/application/services/realtime-session.service.ts";
import { RoomSource } from "@/domain/enums/room-source.enum.ts";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import type { NormalizedAudioEvent } from "@/domain/ports/audio-provider.port.ts";
import type { TextStreamEvent } from "@/domain/ports/text-stream.port.ts";

function createFakes() {
  const publishedEvents: TextStreamEvent[] = [];

  const callService = {
    createCall: mock(() =>
      Promise.resolve({ token: "t", expiresAt: new Date() }),
    ),
    terminateCall: mock(() => Promise.resolve()),
    buildAudioProviderConfig: mock(() =>
      Promise.resolve({
        instructions: "",
        tools: [],
        voice: "marin",
      }),
    ),
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

  const roomEventRepository = {
    create: mock(() => Promise.resolve({})),
    findByRoomId: mock(() => Promise.resolve([])),
  };

  const toolExecution = {
    dispatch: mock(() =>
      Promise.resolve({
        toolInvoke: {
          entityId: "e-1",
          id: "inv-1",
          roomId: "r-1",
          status: "RUNNING",
          createdAt: new Date(),
        },
        immediate: "processing" as const,
      }),
    ),
    getToolStatus: mock(() => Promise.resolve({ status: "NOT_FOUND" })),
  };

  const service = new RealtimeSessionService(
    callService as never,
    roomEventRepository as never,
    logger as never,
    textStream as never,
    toolExecution as never,
  );

  return {
    service,
    callService,
    textStream,
    publishedEvents,
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

  describe("unhandled event types", () => {
    it("should not throw for speech_started event", async () => {
      await fakes.service.processEvent(
        { type: "speech_started" } satisfies NormalizedAudioEvent,
        ROOM,
      );
      // No assertion needed — just should not throw
    });

    it("should not throw for audio.delta event", async () => {
      await fakes.service.processEvent(
        {
          type: "audio.delta",
          base64: "AAAA",
        } satisfies NormalizedAudioEvent,
        ROOM,
      );
      // No assertion needed — just should not throw
    });
  });

  describe("response.done without shouldCloseCall", () => {
    it("should NOT terminate when shouldCloseCall is false", async () => {
      await fakes.service.processEvent(
        { type: "response.done" } satisfies NormalizedAudioEvent,
        ROOM,
      );

      expect(fakes.callService.terminateCall).not.toHaveBeenCalled();
    });
  });
});
