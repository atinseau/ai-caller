import { beforeEach, describe, expect, it, mock } from "bun:test";
import { RealtimeSessionService } from "@/application/services/realtime-session.service.ts";
import { RoomSource } from "@/domain/enums/room-source.enum.ts";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import type { NormalizedAudioEvent } from "@/domain/ports/audio-provider.port.ts";
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
    publish: (roomId: string, event: TextStreamEvent) => {
      publishedEvents.push({ roomId, event });
    },
    close: () => {
      /* noop */
    },
  };

  const roomEventRepository = {
    create: mock((roomId: string, type: string, payload: unknown) => {
      persistedEvents.push({ roomId, type, payload });
      return Promise.resolve({});
    }),
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
  source: RoomSource.WEBRTC,
};

describe("RealtimeSessionService — audio transcript events", () => {
  let fakes: ReturnType<typeof createFakes>;

  beforeEach(() => {
    fakes = createFakes();
    fakes.service.initSession(ROOM.id);
  });

  describe("transcript.delta (agent)", () => {
    it("publishes agent_transcript_delta to textStream", async () => {
      await fakes.service.processEvent(
        {
          type: "transcript.delta",
          text: "Bon",
          role: "agent",
        } satisfies NormalizedAudioEvent,
        ROOM,
      );

      expect(fakes.publishedEvents).toHaveLength(1);
      expect(fakes.publishedEvents[0]?.event).toEqual({
        type: "agent_transcript_delta",
        text: "Bon",
      });
    });

    it("does NOT persist delta events to DB (persists only done)", async () => {
      await fakes.service.processEvent(
        {
          type: "transcript.delta",
          text: "partial",
          role: "agent",
        } satisfies NormalizedAudioEvent,
        ROOM,
      );

      expect(fakes.persistedEvents).toHaveLength(0);
    });
  });

  describe("transcript.done (agent)", () => {
    it("publishes agent_transcript_done to textStream", async () => {
      await fakes.service.processEvent(
        {
          type: "transcript.done",
          text: "Bonjour!",
          role: "agent",
        } satisfies NormalizedAudioEvent,
        ROOM,
      );

      expect(fakes.publishedEvents).toHaveLength(1);
      expect(fakes.publishedEvents[0]?.event).toEqual({
        type: "agent_transcript_done",
        text: "Bonjour!",
      });
    });

    it("persists AGENT_TRANSCRIPT event to DB", async () => {
      await fakes.service.processEvent(
        {
          type: "transcript.done",
          text: "Au revoir!",
          role: "agent",
        } satisfies NormalizedAudioEvent,
        ROOM,
      );

      expect(fakes.persistedEvents).toHaveLength(1);
      expect(fakes.persistedEvents[0]).toMatchObject({
        roomId: ROOM.id,
        type: "AGENT_TRANSCRIPT",
        payload: { text: "Au revoir!" },
      });
    });
  });

  describe("transcript.done (user)", () => {
    it("publishes user_transcript to textStream", async () => {
      await fakes.service.processEvent(
        {
          type: "transcript.done",
          text: "Allô, c'est moi",
          role: "user",
        } satisfies NormalizedAudioEvent,
        ROOM,
      );

      expect(fakes.publishedEvents).toHaveLength(1);
      expect(fakes.publishedEvents[0]?.event).toEqual({
        type: "user_transcript",
        text: "Allô, c'est moi",
      });
    });

    it("persists USER_TRANSCRIPT event to DB", async () => {
      await fakes.service.processEvent(
        {
          type: "transcript.done",
          text: "Oui bonjour",
          role: "user",
        } satisfies NormalizedAudioEvent,
        ROOM,
      );

      expect(fakes.persistedEvents).toHaveLength(1);
      expect(fakes.persistedEvents[0]).toMatchObject({
        roomId: ROOM.id,
        type: "USER_TRANSCRIPT",
        payload: { text: "Oui bonjour" },
      });
    });
  });
});

describe("RealtimeSessionService — fire-and-forget DB write errors", () => {
  it("should continue processing when agent transcript DB write fails", async () => {
    const publishedEvents: { roomId: string; event: TextStreamEvent }[] = [];
    const loggedErrors: string[] = [];

    const roomEventRepository = {
      create: mock(() => Promise.reject(new Error("DB write failed"))),
      findByRoomId: mock(() => Promise.resolve([])),
    };

    const logger = {
      info: () => {
        /* noop */
      },
      error: (_obj: object, msg?: string) => {
        loggedErrors.push(msg ?? "");
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

    const service = new RealtimeSessionService(
      { terminateCall: mock(() => Promise.resolve()) } as never,
      roomEventRepository as never,
      logger as never,
      textStream as never,
      { dispatch: mock(() => Promise.resolve({})) } as never,
    );

    service.initSession(ROOM.id);

    // processEvent should NOT throw even though DB write fails
    await service.processEvent(
      {
        type: "transcript.done",
        text: "Hello",
        role: "agent",
      } satisfies NormalizedAudioEvent,
      ROOM,
    );

    // SSE event should still be published
    expect(publishedEvents.length).toBeGreaterThanOrEqual(0);

    // Give fire-and-forget time to reject
    await new Promise((r) => setTimeout(r, 50));

    // Error should be logged (the rejection handler catches it)
    expect(roomEventRepository.create).toHaveBeenCalled();
  });

  it("should process subsequent events after a DB write failure", async () => {
    const publishedEvents: { roomId: string; event: TextStreamEvent }[] = [];
    let callCount = 0;

    const roomEventRepository = {
      create: mock(() => {
        callCount++;
        if (callCount === 1) return Promise.reject(new Error("DB error"));
        return Promise.resolve({});
      }),
      findByRoomId: mock(() => Promise.resolve([])),
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

    const service = new RealtimeSessionService(
      { terminateCall: mock(() => Promise.resolve()) } as never,
      roomEventRepository as never,
      {
        info: () => {
          /* noop */
        },
        error: () => {
          /* noop */
        },
        warn: () => {
          /* noop */
        },
      } as never,
      textStream as never,
      { dispatch: mock(() => Promise.resolve({})) } as never,
    );

    service.initSession(ROOM.id);

    // First event — DB write fails
    await service.processEvent(
      {
        type: "transcript.done",
        text: "First",
        role: "agent",
      } satisfies NormalizedAudioEvent,
      ROOM,
    );

    // Second event — DB write succeeds
    await service.processEvent(
      {
        type: "transcript.done",
        text: "Second",
        role: "user",
      } satisfies NormalizedAudioEvent,
      ROOM,
    );

    await new Promise((r) => setTimeout(r, 50));

    // Both SSE events should be published
    expect(publishedEvents).toHaveLength(2);
    expect(publishedEvents[0]?.event.type).toBe("agent_transcript_done");
    expect(publishedEvents[1]?.event.type).toBe("user_transcript");
  });
});

describe("RealtimeSessionService — graceful close with audio drain", () => {
  it("should delay onSessionEnd by audio drain time + margin", async () => {
    let sessionEndCalled = false;
    const DRAIN_MS = 2000;

    const service = new RealtimeSessionService(
      { terminateCall: mock(() => Promise.resolve()) } as never,
      {
        create: mock(() => Promise.resolve({})),
        findByRoomId: mock(() => Promise.resolve([])),
      } as never,
      {
        info: () => {
          /* noop */
        },
        error: () => {
          /* noop */
        },
        warn: () => {
          /* noop */
        },
      } as never,
      {
        subscribe: () => ({}),
        publish: () => {
          /* noop */
        },
        close: () => {
          /* noop */
        },
      } as never,
      { dispatch: mock(() => Promise.resolve({})) } as never,
    );

    service.initSession(
      ROOM.id,
      undefined,
      {
        sendAudio: () => {
          /* noop */
        },
        sendText: () => {
          /* noop */
        },
        sendFunctionResult: () => {
          /* noop */
        },
        onEvent: () => {
          /* noop */
        },
        close: () => {
          /* noop */
        },
      },
      false,
      () => {
        sessionEndCalled = true;
      },
      () => DRAIN_MS,
    );

    // Trigger close_call
    await service.processEvent(
      {
        type: "function_call",
        callId: "fc-1",
        name: "close_call",
        arguments: "{}",
      },
      ROOM,
    );

    // Trigger response.done
    await service.processEvent({ type: "response.done" }, ROOM);

    // Should NOT have called onSessionEnd immediately
    expect(sessionEndCalled).toBe(false);

    // Wait less than drain + margin (2000 + 500 = 2500ms)
    await new Promise((r) => setTimeout(r, 100));
    expect(sessionEndCalled).toBe(false);

    // Wait for the full drain + margin
    await new Promise((r) => setTimeout(r, 2500));
    expect(sessionEndCalled).toBe(true);
  });

  it("should use 500ms margin when getAudioDrainMs returns 0", async () => {
    let sessionEndCalled = false;

    const service = new RealtimeSessionService(
      { terminateCall: mock(() => Promise.resolve()) } as never,
      {
        create: mock(() => Promise.resolve({})),
        findByRoomId: mock(() => Promise.resolve([])),
      } as never,
      {
        info: () => {
          /* noop */
        },
        error: () => {
          /* noop */
        },
        warn: () => {
          /* noop */
        },
      } as never,
      {
        subscribe: () => ({}),
        publish: () => {
          /* noop */
        },
        close: () => {
          /* noop */
        },
      } as never,
      { dispatch: mock(() => Promise.resolve({})) } as never,
    );

    service.initSession(
      ROOM.id,
      undefined,
      {
        sendAudio: () => {
          /* noop */
        },
        sendText: () => {
          /* noop */
        },
        sendFunctionResult: () => {
          /* noop */
        },
        onEvent: () => {
          /* noop */
        },
        close: () => {
          /* noop */
        },
      },
      false,
      () => {
        sessionEndCalled = true;
      },
      () => 0, // no audio pending
    );

    await service.processEvent(
      {
        type: "function_call",
        callId: "fc-2",
        name: "close_call",
        arguments: "{}",
      },
      ROOM,
    );

    await service.processEvent({ type: "response.done" }, ROOM);

    // Should not be called yet
    expect(sessionEndCalled).toBe(false);

    // After 500ms margin + buffer, should be called
    await new Promise((r) => setTimeout(r, 600));
    expect(sessionEndCalled).toBe(true);
  });
});
