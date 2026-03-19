import { beforeEach, describe, expect, it, mock } from "bun:test";
import { RealtimeSessionService } from "@/application/services/realtime-session.service.ts";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import type { TextStreamEvent } from "@/domain/ports/text-stream.port.ts";

function createFakes() {
  const publishedEvents: { roomId: string; event: TextStreamEvent }[] = [];
  const persistedEvents: { roomId: string; type: string; payload: unknown }[] =
    [];

  const callService = {
    createCall: mock(() =>
      Promise.resolve({ token: "t", expiresAt: new Date() }),
    ),
    terminateCall: mock(() => Promise.resolve()),
  };

  const toolRepository = {
    createToolInvoke: mock(() =>
      Promise.resolve({
        id: "inv-1",
        entityId: "e-1",
        roomId: "r-1",
        status: "RUNNING",
        createdAt: new Date(),
      }),
    ),
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

  const subAgent = {
    execute: mock(() => Promise.resolve({ summary: "done" })),
  };

  const roomEventRepository = {
    create: mock((roomId: string, type: string, payload: unknown) => {
      persistedEvents.push({ roomId, type, payload });
      return Promise.resolve({});
    }),
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
    publishedEvents,
    persistedEvents,
    roomEventRepository,
  };
}

const ROOM: IRoomModel = {
  id: "room-transcript-1",
  companyId: "company-1",
  token: "tok",
  callId: "call-1",
  expiresAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  modality: "AUDIO",
  isTest: false,
};

describe("RealtimeSessionService — audio transcript events", () => {
  let fakes: ReturnType<typeof createFakes>;

  beforeEach(() => {
    fakes = createFakes();
    fakes.service.initSession(ROOM.id);
  });

  describe("response.audio_transcript.delta", () => {
    it("publishes agent_transcript_delta to textStream", async () => {
      await fakes.service.processMessage(
        { type: "response.audio_transcript.delta", delta: "Bon" } as never,
        ROOM,
      );

      expect(fakes.publishedEvents).toHaveLength(1);
      expect(fakes.publishedEvents[0]?.event).toEqual({
        type: "agent_transcript_delta",
        text: "Bon",
      });
    });

    it("returns no client events (fire-and-forget)", async () => {
      const events = await fakes.service.processMessage(
        { type: "response.audio_transcript.delta", delta: "Hello" } as never,
        ROOM,
      );

      expect(events).toHaveLength(0);
    });

    it("does NOT persist delta events to DB (persists only done)", async () => {
      await fakes.service.processMessage(
        { type: "response.audio_transcript.delta", delta: "partial" } as never,
        ROOM,
      );

      expect(fakes.persistedEvents).toHaveLength(0);
    });

    it("handles missing delta field gracefully (defaults to empty string)", async () => {
      await fakes.service.processMessage(
        { type: "response.audio_transcript.delta" } as never,
        ROOM,
      );

      expect(fakes.publishedEvents[0]?.event).toEqual({
        type: "agent_transcript_delta",
        text: "",
      });
    });
  });

  describe("response.audio_transcript.done", () => {
    it("publishes agent_transcript_done to textStream", async () => {
      await fakes.service.processMessage(
        {
          type: "response.audio_transcript.done",
          transcript: "Bonjour!",
        } as never,
        ROOM,
      );

      expect(fakes.publishedEvents).toHaveLength(1);
      expect(fakes.publishedEvents[0]?.event).toEqual({
        type: "agent_transcript_done",
        text: "Bonjour!",
      });
    });

    it("persists AGENT_TRANSCRIPT event to DB", async () => {
      await fakes.service.processMessage(
        {
          type: "response.audio_transcript.done",
          transcript: "Au revoir!",
        } as never,
        ROOM,
      );

      expect(fakes.persistedEvents).toHaveLength(1);
      expect(fakes.persistedEvents[0]).toMatchObject({
        roomId: ROOM.id,
        type: "AGENT_TRANSCRIPT",
        payload: { text: "Au revoir!" },
      });
    });

    it("handles missing transcript field gracefully", async () => {
      await fakes.service.processMessage(
        { type: "response.audio_transcript.done" } as never,
        ROOM,
      );

      expect(fakes.publishedEvents[0]?.event).toEqual({
        type: "agent_transcript_done",
        text: "",
      });
    });
  });

  describe("conversation.item.input_audio_transcription.completed", () => {
    it("publishes user_transcript to textStream", async () => {
      await fakes.service.processMessage(
        {
          type: "conversation.item.input_audio_transcription.completed",
          transcript: "Allô, c'est moi",
        } as never,
        ROOM,
      );

      expect(fakes.publishedEvents).toHaveLength(1);
      expect(fakes.publishedEvents[0]?.event).toEqual({
        type: "user_transcript",
        text: "Allô, c'est moi",
      });
    });

    it("persists USER_TRANSCRIPT event to DB", async () => {
      await fakes.service.processMessage(
        {
          type: "conversation.item.input_audio_transcription.completed",
          transcript: "Oui bonjour",
        } as never,
        ROOM,
      );

      expect(fakes.persistedEvents).toHaveLength(1);
      expect(fakes.persistedEvents[0]).toMatchObject({
        roomId: ROOM.id,
        type: "USER_TRANSCRIPT",
        payload: { text: "Oui bonjour" },
      });
    });

    it("handles missing transcript field gracefully", async () => {
      await fakes.service.processMessage(
        {
          type: "conversation.item.input_audio_transcription.completed",
        } as never,
        ROOM,
      );

      expect(fakes.publishedEvents[0]?.event).toEqual({
        type: "user_transcript",
        text: "",
      });
    });

    it("returns no client events", async () => {
      const events = await fakes.service.processMessage(
        {
          type: "conversation.item.input_audio_transcription.completed",
          transcript: "test",
        } as never,
        ROOM,
      );

      expect(events).toHaveLength(0);
    });
  });
});
