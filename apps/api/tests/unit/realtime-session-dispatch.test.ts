import { beforeEach, describe, expect, it, mock } from "bun:test";
import { RealtimeSessionService } from "@/application/services/realtime-session.service.ts";
import { RoomSource } from "@/domain/enums/room-source.enum.ts";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import type {
  AudioProviderConnection,
  NormalizedAudioEvent,
} from "@/domain/ports/audio-provider.port.ts";
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
          id: "inv-1",
          entityId: "e-1",
          roomId: "room-1",
          toolName: "search_customer",
          status: "RUNNING",
          createdAt: new Date(),
        },
        immediate: "processing" as const,
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

function createMockConnection(): AudioProviderConnection & {
  sendFunctionResult: ReturnType<typeof mock>;
  sendText: ReturnType<typeof mock>;
} {
  return {
    sendAudio: () => {
      /* noop */
    },
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

describe("RealtimeSessionService — sub-agent dispatch", () => {
  let fakes: ReturnType<typeof createFakes>;
  let connection: ReturnType<typeof createMockConnection>;

  beforeEach(() => {
    fakes = createFakes();
    connection = createMockConnection();
    fakes.service.initSession(ROOM.id, "http://mcp.test", connection);
  });

  it("should set shouldCloseCall on close_call function", async () => {
    await fakes.service.processEvent(
      {
        type: "function_call",
        callId: "fc-close",
        name: "close_call",
        arguments: "{}",
      } satisfies NormalizedAudioEvent,
      ROOM,
    );

    // Verify close flag by triggering response.done
    await fakes.service.processEvent(
      { type: "response.done" } satisfies NormalizedAudioEvent,
      ROOM,
    );
    expect(fakes.callService.terminateCall).toHaveBeenCalled();
  });

  it("should send tool status via connection on get_tool_status function call", async () => {
    await fakes.service.processEvent(
      {
        type: "function_call",
        callId: "cid-2",
        name: "get_tool_status",
        arguments: '{"tool_invoke_id":"e-1"}',
      } satisfies NormalizedAudioEvent,
      ROOM,
    );

    expect(connection.sendFunctionResult).toHaveBeenCalled();
    const [callId, output] = connection.sendFunctionResult.mock.calls[0] as [
      string,
      string,
    ];
    expect(callId).toBe("cid-2");
    const parsed = JSON.parse(output);
    expect(parsed.status).toBe("COMPLETED");
    expect(parsed.toolName).toBe("search_customer");
  });

  it("should dispatch sub-agent for MCP-backed function calls", async () => {
    await fakes.service.processEvent(
      {
        type: "function_call",
        callId: "cid-3",
        name: "search_customer",
        arguments: '{"name":"John"}',
      } satisfies NormalizedAudioEvent,
      ROOM,
    );

    // Should send processing response via connection
    expect(connection.sendFunctionResult).toHaveBeenCalled();
    const [, output] = connection.sendFunctionResult.mock.calls[0] as [
      string,
      string,
    ];
    const parsed = JSON.parse(output);
    expect(parsed.status).toBe("processing");
    expect(parsed.tool_invoke_id).toBeDefined();
  });

  it("should dispatch toolExecution for MCP-backed function calls", async () => {
    await fakes.service.processEvent(
      {
        type: "function_call",
        callId: "cid-4",
        name: "search_customer",
        arguments: '{"name":"Jane"}',
      } satisfies NormalizedAudioEvent,
      ROOM,
    );

    expect(fakes.toolExecution.dispatch).toHaveBeenCalled();
    const params = (
      fakes.toolExecution.dispatch.mock.calls[0] as unknown[]
    )?.[0] as {
      toolName: string;
      mcpUrl: string;
      args: Record<string, unknown>;
    };
    expect(params.toolName).toBe("search_customer");
    expect(params.mcpUrl).toBe("http://mcp.test");
    expect(params.args).toEqual({ name: "Jane" });
  });

  it("should pass correct params to toolExecution.dispatch", async () => {
    await fakes.service.processEvent(
      {
        type: "function_call",
        callId: "cid-5",
        name: "get_weather",
        arguments: '{"city":"Paris"}',
      } satisfies NormalizedAudioEvent,
      ROOM,
    );

    expect(fakes.toolExecution.dispatch).toHaveBeenCalled();
    const params = (
      fakes.toolExecution.dispatch.mock.calls[0] as unknown[]
    )?.[0] as {
      toolName: string;
      roomId: string;
      callId: string;
    };
    expect(params.toolName).toBe("get_weather");
    expect(params.roomId).toBe(ROOM.id);
    expect(params.callId).toBe("cid-5");
  });

  it("should inject result via connection after dispatch completes", async () => {
    // Override dispatch to call onResult synchronously
    // biome-ignore lint/suspicious/noExplicitAny: mock override needs flexible typing
    (fakes.toolExecution.dispatch as any).mockImplementation(
      (params: { onResult: (toolName: string, summary: string) => void }) => {
        setTimeout(
          () => params.onResult("search_customer", "Customer found"),
          10,
        );
        return Promise.resolve({
          toolInvoke: {
            id: "inv-1",
            entityId: "e-1",
            roomId: "room-1",
            status: "RUNNING",
            createdAt: new Date(),
          },
          immediate: "processing" as const,
        });
      },
    );

    await fakes.service.processEvent(
      {
        type: "function_call",
        callId: "cid-6",
        name: "search_customer",
        arguments: '{"name":"John"}',
      } satisfies NormalizedAudioEvent,
      ROOM,
    );

    // Wait for the async onResult callback
    await new Promise((r) => setTimeout(r, 100));

    // connection.sendText should have been called with the result injection
    expect(connection.sendText).toHaveBeenCalled();
  });
});
