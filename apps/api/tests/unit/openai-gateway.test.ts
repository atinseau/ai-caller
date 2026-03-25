import { describe, expect, it } from "bun:test";
import { RoomSource } from "@/domain/enums/room-source.enum.ts";
import type { NormalizedAudioEvent } from "@/domain/ports/audio-provider.port.ts";

describe("RealtimeAudioGateway — edge cases", () => {
  it("openRoomChannel should return early for TEXT modality rooms", async () => {
    const { RealtimeAudioGateway } = await import(
      "@/infrastructure/gateway/realtime-audio.gateway.ts"
    );

    const audioProvider = {
      connect: async () => ({
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
      }),
    };

    const sessionService = {
      initSession: () => {
        /* noop */
      },
      destroySession: () => {
        /* noop */
      },
      processEvent: async () => {
        /* noop */
      },
    };

    const logger = {
      info: () => {
        /* noop */
      },
      warn: () => {
        /* noop */
      },
      error: () => {
        /* noop */
      },
    };

    const gateway = new RealtimeAudioGateway(
      audioProvider as never,
      sessionService as never,
      logger as never,
    );

    // Should not throw — TEXT rooms are skipped
    await gateway.openRoomChannel(
      {
        id: "r-1",
        companyId: "c-1",
        token: "tok",
        callId: null,
        modality: "TEXT",
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isTest: false,
        source: RoomSource.WEBRTC,
      },
      {
        instructions: "test",
        tools: [],
        voice: "marin",
      },
    );
  });

  it("closeRoomChannel should not crash on nonexistent room", () => {
    const { RealtimeAudioGateway } =
      require("@/infrastructure/gateway/realtime-audio.gateway.ts");

    const gateway = new RealtimeAudioGateway(
      {} as never,
      {
        destroySession: () => {
          /* noop */
        },
      } as never,
      {
        info: () => {
          /* noop */
        },
        warn: () => {
          /* noop */
        },
      } as never,
    );

    // Should not throw
    gateway.closeRoomChannel("nonexistent-room");
  });

  it("forwardAudioToProvider should not crash on nonexistent room", () => {
    const { RealtimeAudioGateway } =
      require("@/infrastructure/gateway/realtime-audio.gateway.ts");

    const gateway = new RealtimeAudioGateway(
      {} as never,
      {} as never,
      {
        warn: () => {
          /* noop */
        },
      } as never,
    );

    // Should not throw
    gateway.forwardAudioToProvider("nonexistent", "base64data");
  });

  it("should forward audio.delta to registered clientSender", async () => {
    const { RealtimeAudioGateway } = await import(
      "@/infrastructure/gateway/realtime-audio.gateway.ts"
    );

    const eventHandlers: Array<(event: NormalizedAudioEvent) => void> = [];
    const sentMessages: Record<string, unknown>[] = [];
    let processEventCalled = false;

    const audioProvider = {
      connect: async () => ({
        sendAudio: () => {
          /* noop */
        },
        sendText: () => {
          /* noop */
        },
        sendFunctionResult: () => {
          /* noop */
        },
        onEvent: (handler: (event: NormalizedAudioEvent) => void) => {
          eventHandlers.push(handler);
        },
        close: () => {
          /* noop */
        },
      }),
    };

    const sessionService = {
      initSession: () => {
        /* noop */
      },
      destroySession: () => {
        /* noop */
      },
      processEvent: () => {
        processEventCalled = true;
        return Promise.resolve();
      },
    };

    const logger = {
      info: () => {
        /* noop */
      },
      warn: () => {
        /* noop */
      },
      error: () => {
        /* noop */
      },
    };

    const gateway = new RealtimeAudioGateway(
      audioProvider as never,
      sessionService as never,
      logger as never,
    );

    await gateway.openRoomChannel(
      {
        id: "r-audio",
        companyId: "c-1",
        token: "tok",
        callId: null,
        modality: "AUDIO" as const,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isTest: false,
        source: RoomSource.WEBRTC,
      },
      { instructions: "test", tools: [], voice: "marin" },
    );

    gateway.registerClientSender("r-audio", (msg) => {
      sentMessages.push(msg);
    });

    // Simulate audio.delta from provider
    const handler = eventHandlers[0];
    if (handler) handler({ type: "audio.delta", base64: "AQID" });

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]).toEqual({ type: "audio", audio: "AQID" });
    expect(processEventCalled).toBe(false);
  });

  it("should forward speech_started as interrupt to clientSender", async () => {
    const { RealtimeAudioGateway } = await import(
      "@/infrastructure/gateway/realtime-audio.gateway.ts"
    );

    const eventHandlers: Array<(event: NormalizedAudioEvent) => void> = [];
    const sentMessages: Record<string, unknown>[] = [];
    let processEventCalled = false;

    const audioProvider = {
      connect: async () => ({
        sendAudio: () => {
          /* noop */
        },
        sendText: () => {
          /* noop */
        },
        sendFunctionResult: () => {
          /* noop */
        },
        onEvent: (handler: (event: NormalizedAudioEvent) => void) => {
          eventHandlers.push(handler);
        },
        close: () => {
          /* noop */
        },
      }),
    };

    const sessionService = {
      initSession: () => {
        /* noop */
      },
      destroySession: () => {
        /* noop */
      },
      processEvent: () => {
        processEventCalled = true;
        return Promise.resolve();
      },
    };

    const logger = {
      info: () => {
        /* noop */
      },
      warn: () => {
        /* noop */
      },
      error: () => {
        /* noop */
      },
    };

    const gateway = new RealtimeAudioGateway(
      audioProvider as never,
      sessionService as never,
      logger as never,
    );

    await gateway.openRoomChannel(
      {
        id: "r-int",
        companyId: "c-1",
        token: "tok",
        callId: null,
        modality: "AUDIO" as const,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isTest: false,
        source: RoomSource.WEBRTC,
      },
      { instructions: "test", tools: [], voice: "marin" },
    );

    gateway.registerClientSender("r-int", (msg) => {
      sentMessages.push(msg);
    });

    const handler = eventHandlers[0];
    if (handler) handler({ type: "speech_started" });

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]).toEqual({ type: "interrupt" });
    expect(processEventCalled).toBe(false);
  });

  it("should pass non-audio events to sessionService.processEvent", async () => {
    const { RealtimeAudioGateway } = await import(
      "@/infrastructure/gateway/realtime-audio.gateway.ts"
    );

    const eventHandlers: Array<(event: NormalizedAudioEvent) => void> = [];
    let processEventCalled = false;

    const audioProvider = {
      connect: async () => ({
        sendAudio: () => {
          /* noop */
        },
        sendText: () => {
          /* noop */
        },
        sendFunctionResult: () => {
          /* noop */
        },
        onEvent: (handler: (event: NormalizedAudioEvent) => void) => {
          eventHandlers.push(handler);
        },
        close: () => {
          /* noop */
        },
      }),
    };

    const sessionService = {
      initSession: () => {
        /* noop */
      },
      destroySession: () => {
        /* noop */
      },
      processEvent: () => {
        processEventCalled = true;
        return Promise.resolve();
      },
    };

    const logger = {
      info: () => {
        /* noop */
      },
      warn: () => {
        /* noop */
      },
      error: () => {
        /* noop */
      },
    };

    const gateway = new RealtimeAudioGateway(
      audioProvider as never,
      sessionService as never,
      logger as never,
    );

    await gateway.openRoomChannel(
      {
        id: "r-evt",
        companyId: "c-1",
        token: "tok",
        callId: null,
        modality: "AUDIO" as const,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isTest: false,
        source: RoomSource.WEBRTC,
      },
      { instructions: "test", tools: [], voice: "marin" },
    );

    const handler = eventHandlers[0];
    if (handler)
      handler({ type: "transcript.done", text: "Hello", role: "agent" });

    await new Promise((r) => setTimeout(r, 10));
    expect(processEventCalled).toBe(true);
  });

  it("cleanupStaleConnections should close rooms without clientSender", async () => {
    const { RealtimeAudioGateway } = await import(
      "@/infrastructure/gateway/realtime-audio.gateway.ts"
    );

    const closedCalls: string[] = [];

    const audioProvider = {
      connect: async () => ({
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
      }),
    };

    const sessionService = {
      initSession: () => {
        /* noop */
      },
      destroySession: (roomId: string) => {
        closedCalls.push(roomId);
      },
      processEvent: async () => {
        /* noop */
      },
    };

    const logger = {
      info: () => {
        /* noop */
      },
      warn: () => {
        /* noop */
      },
      error: () => {
        /* noop */
      },
    };

    const gateway = new RealtimeAudioGateway(
      audioProvider as never,
      sessionService as never,
      logger as never,
    );

    // Open 2 rooms
    await gateway.openRoomChannel(
      {
        id: "r-stale",
        companyId: "c-1",
        token: "tok",
        callId: null,
        modality: "AUDIO" as const,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isTest: false,
        source: RoomSource.WEBRTC,
      },
      { instructions: "test", tools: [], voice: "marin" },
    );

    await gateway.openRoomChannel(
      {
        id: "r-active",
        companyId: "c-1",
        token: "tok",
        callId: null,
        modality: "AUDIO" as const,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isTest: false,
        source: RoomSource.WEBRTC,
      },
      { instructions: "test", tools: [], voice: "marin" },
    );

    // Only register clientSender for r-active
    gateway.registerClientSender("r-active", () => {
      /* noop */
    });

    // Trigger cleanup manually (the private method — access via prototype)
    (
      gateway as unknown as { cleanupStaleConnections: () => void }
    ).cleanupStaleConnections();

    // r-stale should be cleaned up, r-active should not
    expect(closedCalls).toContain("r-stale");
    expect(closedCalls).not.toContain("r-active");
  });

  it("should track audio bytes and compute drain duration correctly", async () => {
    const { RealtimeAudioGateway } = await import(
      "@/infrastructure/gateway/realtime-audio.gateway.ts"
    );

    const eventHandlers: Array<(event: NormalizedAudioEvent) => void> = [];
    let _capturedDrainMs = -1;

    const audioProvider = {
      connect: async () => ({
        sendAudio: () => {
          /* noop */
        },
        sendText: () => {
          /* noop */
        },
        sendFunctionResult: () => {
          /* noop */
        },
        onEvent: (handler: (event: NormalizedAudioEvent) => void) => {
          eventHandlers.push(handler);
        },
        close: () => {
          /* noop */
        },
      }),
    };

    const sessionService = {
      initSession: (
        _roomId: string,
        _mcpUrl: unknown,
        _conn: unknown,
        _isTest: unknown,
        _onEnd: unknown,
        getAudioDrainMs?: () => number,
      ) => {
        // Capture the callback for testing
        if (getAudioDrainMs) {
          _capturedDrainMs = 0; // mark as captured
          // Store reference for later invocation
          (sessionService as Record<string, unknown>)._drainFn =
            getAudioDrainMs;
        }
      },
      destroySession: () => {
        /* noop */
      },
      processEvent: () => Promise.resolve(),
    };

    const logger = {
      info: () => {
        /* noop */
      },
      warn: () => {
        /* noop */
      },
      error: () => {
        /* noop */
      },
    };

    const gateway = new RealtimeAudioGateway(
      audioProvider as never,
      sessionService as never,
      logger as never,
    );

    await gateway.openRoomChannel(
      {
        id: "r-drain",
        companyId: "c-1",
        token: "tok",
        callId: null,
        modality: "AUDIO" as const,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isTest: false,
        source: RoomSource.WEBRTC,
      },
      { instructions: "test", tools: [], voice: "marin" },
    );

    // Register client sender so audio.delta is forwarded (and tracked)
    gateway.registerClientSender("r-drain", () => {
      /* noop */
    });

    const handler = eventHandlers[0];
    if (!handler) throw new Error("No event handler registered");

    // Send 3 audio.delta chunks — each is 8 base64 chars = 6 decoded bytes
    // PCM16 @ 24kHz: 6 bytes = 3 samples = 3/24000 seconds = 0.125ms per chunk
    handler({ type: "audio.delta", base64: "AQIDBAUG" }); // 8 chars → 6 bytes
    handler({ type: "audio.delta", base64: "AQIDBAUG" });
    handler({ type: "audio.delta", base64: "AQIDBAUG" });

    // Get drain duration via the captured callback
    const drainFn = (sessionService as Record<string, unknown>)._drainFn as
      | (() => number)
      | undefined;
    expect(drainFn).toBeDefined();
    const drainMs = drainFn?.() ?? -1;

    // 3 chunks × 6 bytes = 18 decoded bytes
    // Duration = 18 / 2 / 24000 * 1000 = 0.375ms
    expect(drainMs).toBeCloseTo(0.375, 2);
  });

  it("should reset audio byte counter on speech_started", async () => {
    const { RealtimeAudioGateway } = await import(
      "@/infrastructure/gateway/realtime-audio.gateway.ts"
    );

    const eventHandlers: Array<(event: NormalizedAudioEvent) => void> = [];

    const audioProvider = {
      connect: async () => ({
        sendAudio: () => {
          /* noop */
        },
        sendText: () => {
          /* noop */
        },
        sendFunctionResult: () => {
          /* noop */
        },
        onEvent: (handler: (event: NormalizedAudioEvent) => void) => {
          eventHandlers.push(handler);
        },
        close: () => {
          /* noop */
        },
      }),
    };

    const sessionService = {
      initSession: (
        _roomId: string,
        _mcpUrl: unknown,
        _conn: unknown,
        _isTest: unknown,
        _onEnd: unknown,
        getAudioDrainMs?: () => number,
      ) => {
        (sessionService as Record<string, unknown>)._drainFn = getAudioDrainMs;
      },
      destroySession: () => {
        /* noop */
      },
      processEvent: () => Promise.resolve(),
    };

    const logger = {
      info: () => {
        /* noop */
      },
      warn: () => {
        /* noop */
      },
      error: () => {
        /* noop */
      },
    };

    const gateway = new RealtimeAudioGateway(
      audioProvider as never,
      sessionService as never,
      logger as never,
    );

    await gateway.openRoomChannel(
      {
        id: "r-reset",
        companyId: "c-1",
        token: "tok",
        callId: null,
        modality: "AUDIO" as const,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isTest: false,
        source: RoomSource.WEBRTC,
      },
      { instructions: "test", tools: [], voice: "marin" },
    );

    gateway.registerClientSender("r-reset", () => {
      /* noop */
    });

    const handler = eventHandlers[0];
    if (!handler) throw new Error("No event handler registered");

    // Send audio, then interrupt, then more audio
    handler({ type: "audio.delta", base64: "AQIDBAUG" }); // 6 bytes
    handler({ type: "audio.delta", base64: "AQIDBAUG" }); // 6 bytes

    // speech_started resets the counter
    handler({ type: "speech_started" });

    // Send one more chunk after reset
    handler({ type: "audio.delta", base64: "AQIDBAUG" }); // 6 bytes

    const drainFn = (sessionService as Record<string, unknown>)._drainFn as
      | (() => number)
      | undefined;
    const drainMs = drainFn?.() ?? -1;

    // Only the last chunk counts: 6 bytes / 2 / 24000 * 1000 = 0.125ms
    expect(drainMs).toBeCloseTo(0.125, 2);
  });
});
