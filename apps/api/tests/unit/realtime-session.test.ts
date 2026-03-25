import { beforeEach, describe, expect, it, mock } from "bun:test";
import { RealtimeSessionService } from "@/application/services/realtime-session.service.ts";
import { RoomSource } from "@/domain/enums/room-source.enum.ts";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import type { TextStreamEvent } from "@/domain/ports/text-stream.port.ts";

function createFakes() {
  const publishedEvents: { roomId: string; event: TextStreamEvent }[] = [];
  const persistedEvents: {
    roomId: string;
    type: string;
    payload: unknown;
  }[] = [];
  let terminateCalled = false;

  const callService = {
    createCall: mock(() =>
      Promise.resolve({ token: "t", expiresAt: new Date() }),
    ),
    terminateCall: mock(() => {
      terminateCalled = true;
      return Promise.resolve();
    }),
    buildAudioProviderConfig: mock(() =>
      Promise.resolve({ instructions: "", tools: [], voice: "marin" }),
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
    close: mock(() => {
      /* noop */
    }),
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
        immediate: "processing" as "processing" | "completed",
        mockSummary: undefined as string | undefined,
      }),
    ),
    getToolStatus: mock(() =>
      Promise.resolve({
        status: "COMPLETED",
        toolName: "search_customer",
        results: { data: "found" },
      }),
    ),
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
    toolExecution,
    textStream,
    publishedEvents,
    persistedEvents,
    roomEventRepository,
    get terminateCalled() {
      return terminateCalled;
    },
  };
}

function createConnection() {
  return {
    sendAudio: mock(() => {
      /* noop */
    }),
    sendText: mock(() => {
      /* noop */
    }),
    sendFunctionResult: mock(() => {
      /* noop */
    }),
    onEvent: () => {
      /* noop */
    },
    close: () => {
      /* noop */
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
  modality: "AUDIO",
  isTest: false,
  source: RoomSource.WEBRTC,
};

describe("RealtimeSessionService — NormalizedAudioEvent", () => {
  let fakes: ReturnType<typeof createFakes>;

  beforeEach(() => {
    fakes = createFakes();
  });

  describe("transcript events", () => {
    it("should publish agent_transcript_delta for agent transcript.delta", async () => {
      fakes.service.initSession(ROOM.id);
      await fakes.service.processEvent(
        { type: "transcript.delta", text: "Bon", role: "agent" },
        ROOM,
      );

      expect(fakes.publishedEvents).toHaveLength(1);
      expect(fakes.publishedEvents[0]?.event).toEqual({
        type: "agent_transcript_delta",
        text: "Bon",
      });
    });

    it("should publish agent_transcript_done and persist for agent transcript.done", async () => {
      fakes.service.initSession(ROOM.id);
      await fakes.service.processEvent(
        { type: "transcript.done", text: "Bonjour!", role: "agent" },
        ROOM,
      );

      expect(fakes.publishedEvents[0]?.event).toEqual({
        type: "agent_transcript_done",
        text: "Bonjour!",
      });
      expect(fakes.persistedEvents[0]).toMatchObject({
        roomId: ROOM.id,
        type: "AGENT_TRANSCRIPT",
        payload: { text: "Bonjour!" },
      });
    });

    it("should publish user_transcript and persist for user transcript.done", async () => {
      fakes.service.initSession(ROOM.id);
      await fakes.service.processEvent(
        { type: "transcript.done", text: "Oui bonjour", role: "user" },
        ROOM,
      );

      expect(fakes.publishedEvents[0]?.event).toEqual({
        type: "user_transcript",
        text: "Oui bonjour",
      });
      expect(fakes.persistedEvents[0]).toMatchObject({
        roomId: ROOM.id,
        type: "USER_TRANSCRIPT",
        payload: { text: "Oui bonjour" },
      });
    });

    it("should not persist agent transcript delta (only done)", async () => {
      fakes.service.initSession(ROOM.id);
      await fakes.service.processEvent(
        { type: "transcript.delta", text: "partial", role: "agent" },
        ROOM,
      );

      expect(fakes.persistedEvents).toHaveLength(0);
    });
  });

  describe("function call handling", () => {
    it("should set shouldCloseCall on close_call and terminate on response.done", async () => {
      const conn = createConnection();
      fakes.service.initSession(ROOM.id, undefined, conn);

      await fakes.service.processEvent(
        {
          type: "function_call",
          callId: "fc-1",
          name: "close_call",
          arguments: "{}",
        },
        ROOM,
      );

      await fakes.service.processEvent({ type: "response.done" }, ROOM);

      expect(fakes.terminateCalled).toBe(true);
    });

    it("should NOT terminate on response.done without close_call", async () => {
      fakes.service.initSession(ROOM.id);

      await fakes.service.processEvent({ type: "response.done" }, ROOM);

      expect(fakes.terminateCalled).toBe(false);
    });

    it("should call getToolStatus for get_tool_status function", async () => {
      const conn = createConnection();
      fakes.service.initSession(ROOM.id, undefined, conn);

      await fakes.service.processEvent(
        {
          type: "function_call",
          callId: "fc-status",
          name: "get_tool_status",
          arguments: '{"tool_invoke_id":"e-1"}',
        },
        ROOM,
      );

      expect(fakes.toolExecution.getToolStatus).toHaveBeenCalledWith("e-1");
      expect(conn.sendFunctionResult).toHaveBeenCalledWith(
        "fc-status",
        JSON.stringify({
          status: "COMPLETED",
          toolName: "search_customer",
          results: { data: "found" },
        }),
      );
    });

    it("should dispatch MCP tool via toolExecution", async () => {
      const conn = createConnection();
      fakes.service.initSession(ROOM.id, "http://mcp.test", conn);

      await fakes.service.processEvent(
        {
          type: "function_call",
          callId: "fc-search",
          name: "search_customer",
          arguments: '{"name":"John"}',
        },
        ROOM,
      );

      expect(fakes.toolExecution.dispatch).toHaveBeenCalled();
      const params = (
        fakes.toolExecution.dispatch.mock.calls[0] as unknown[]
      )?.[0] as {
        roomId: string;
        callId: string;
        toolName: string;
        args: Record<string, unknown>;
        mcpUrl: string;
      };
      expect(params.roomId).toBe(ROOM.id);
      expect(params.callId).toBe("fc-search");
      expect(params.toolName).toBe("search_customer");
      expect(params.args).toEqual({ name: "John" });
      expect(params.mcpUrl).toBe("http://mcp.test");
    });

    it("should send processing result via sendFunctionResult for MCP dispatch", async () => {
      const conn = createConnection();
      fakes.service.initSession(ROOM.id, "http://mcp.test", conn);

      await fakes.service.processEvent(
        {
          type: "function_call",
          callId: "fc-mcp",
          name: "get_weather",
          arguments: '{"city":"Paris"}',
        },
        ROOM,
      );

      expect(conn.sendFunctionResult).toHaveBeenCalledWith(
        "fc-mcp",
        JSON.stringify({
          status: "processing",
          tool_invoke_id: "e-1",
        }),
      );
    });

    it("should send completed result for test mode dispatch", async () => {
      const conn = createConnection();
      fakes.service.initSession(ROOM.id, "http://mcp.test", conn, true);

      fakes.toolExecution.dispatch.mockReturnValue(
        Promise.resolve({
          toolInvoke: {
            entityId: "e-test",
            id: "inv-test",
            roomId: ROOM.id,
            status: "RUNNING",
            createdAt: new Date(),
          },
          immediate: "completed" as const,
          mockSummary: "[TEST] search_customer executed successfully (mocked)",
        }),
      );

      await fakes.service.processEvent(
        {
          type: "function_call",
          callId: "fc-test",
          name: "search_customer",
          arguments: "{}",
        },
        ROOM,
      );

      expect(conn.sendFunctionResult).toHaveBeenCalledWith(
        "fc-test",
        JSON.stringify({
          status: "completed",
          result: "[TEST] search_customer executed successfully (mocked)",
        }),
      );
    });
  });

  describe("lifecycle", () => {
    it("should close text stream on destroy", () => {
      fakes.service.initSession(ROOM.id);
      fakes.service.destroySession(ROOM.id);
      expect(fakes.textStream.close).toHaveBeenCalledWith(ROOM.id);
    });

    it("should not process events after destroy", async () => {
      fakes.service.initSession(ROOM.id);
      fakes.service.destroySession(ROOM.id);

      await fakes.service.processEvent({ type: "response.done" }, ROOM);

      expect(fakes.terminateCalled).toBe(false);
    });
  });

  describe("unhandled events", () => {
    it("should not throw for audio.delta (handled by gateway, not session)", async () => {
      fakes.service.initSession(ROOM.id);
      await fakes.service.processEvent(
        { type: "audio.delta", base64: "data==" },
        ROOM,
      );

      expect(fakes.publishedEvents).toHaveLength(0);
    });

    it("should not throw for speech_started", async () => {
      fakes.service.initSession(ROOM.id);
      await fakes.service.processEvent({ type: "speech_started" }, ROOM);

      expect(fakes.publishedEvents).toHaveLength(0);
    });
  });
});
