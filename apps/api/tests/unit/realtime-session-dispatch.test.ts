import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Schema } from "@ai-caller/shared";
import { RealtimeSessionService } from "@/application/services/realtime-session.service.ts";
import { RoomSource } from "@/domain/enums/room-source.enum.ts";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import type { TextStreamEvent } from "@/domain/ports/text-stream.port.ts";

function createFakes() {
  const publishedEvents: TextStreamEvent[] = [];
  const createdInvokes: unknown[][] = [];

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
        entityId: args[1],
        roomId: args[0],
        toolName: args[2],
        status: "RUNNING",
        createdAt: new Date(),
      });
    }),
    completeToolInvokeByEntityId: mock(() => Promise.resolve({})),
    failToolInvoke: mock(() => Promise.resolve({})),
    findByEntityId: mock((entityId: string) =>
      Promise.resolve({
        id: "inv-1",
        entityId,
        roomId: "room-1",
        toolName: "search_customer",
        status: "COMPLETED",
        results: { data: "found" },
        createdAt: new Date(),
      }),
    ),
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

  const subAgent = {
    execute: mock(() =>
      Promise.resolve({
        toolInvokeId: "e-1",
        summary: "Customer found",
        rawResult: {},
      }),
    ),
  };

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
    subAgent,
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

const sendToRoom = mock(() => {
  /* noop */
});

describe("RealtimeSessionService — sub-agent dispatch", () => {
  let fakes: ReturnType<typeof createFakes>;

  beforeEach(() => {
    fakes = createFakes();
    sendToRoom.mockClear();
    fakes.service.initSession(ROOM.id, "http://mcp.test", sendToRoom);
  });

  it("should set shouldCloseCall on close_call function", async () => {
    const events = await fakes.service.processMessage(
      {
        type: "response.output_item.done",
        item: {
          type: "function_call",
          id: "fc-close",
          call_id: "cid-1",
          name: "close_call",
          status: "completed",
          arguments: "{}",
        },
      } as unknown as Schema["RealtimeServerEvent"],
      ROOM,
    );

    expect(events.length).toBeGreaterThan(0);

    // Verify close flag by triggering audio buffer stopped
    await fakes.service.processMessage(
      { type: "output_audio_buffer.stopped" } as Schema["RealtimeServerEvent"],
      ROOM,
    );
    expect(fakes.callService.terminateCall).toHaveBeenCalled();
  });

  it("should return tool status on get_tool_status function call", async () => {
    const events = await fakes.service.processMessage(
      {
        type: "response.output_item.done",
        item: {
          type: "function_call",
          id: "fc-status",
          call_id: "cid-2",
          name: "get_tool_status",
          status: "completed",
          arguments: '{"tool_invoke_id":"e-1"}',
        },
      } as unknown as Schema["RealtimeServerEvent"],
      ROOM,
    );

    expect(events).toHaveLength(2);
    // First event should be function_call_output with status
    const outputEvent = events[0] as unknown as {
      item: { output: string };
    };
    const output = JSON.parse(outputEvent.item.output);
    expect(output.status).toBe("COMPLETED");
    expect(output.toolName).toBe("search_customer");
  });

  it("should dispatch sub-agent for MCP-backed function calls", async () => {
    const events = await fakes.service.processMessage(
      {
        type: "response.output_item.done",
        item: {
          type: "function_call",
          id: "fc-search",
          call_id: "cid-3",
          name: "search_customer",
          status: "completed",
          arguments: '{"name":"John"}',
        },
      } as unknown as Schema["RealtimeServerEvent"],
      ROOM,
    );

    // Should return function_call_output { processing } + response.create
    expect(events).toHaveLength(2);
    const outputEvent = events[0] as unknown as {
      item: { output: string };
    };
    const output = JSON.parse(outputEvent.item.output);
    expect(output.status).toBe("processing");
    expect(output.tool_invoke_id).toBeDefined();
  });

  it("should create ToolInvoke for MCP-backed function calls", async () => {
    await fakes.service.processMessage(
      {
        type: "response.output_item.done",
        item: {
          type: "function_call",
          id: "fc-track",
          call_id: "cid-4",
          name: "search_customer",
          status: "completed",
          arguments: '{"name":"Jane"}',
        },
      } as unknown as Schema["RealtimeServerEvent"],
      ROOM,
    );

    expect(fakes.toolRepository.createToolInvoke).toHaveBeenCalled();
    expect(fakes.createdInvokes[0]?.[2]).toBe("search_customer");
  });

  it("should call subAgent.execute for MCP-backed function calls", async () => {
    await fakes.service.processMessage(
      {
        type: "response.output_item.done",
        item: {
          type: "function_call",
          id: "fc-dispatch",
          call_id: "cid-5",
          name: "get_weather",
          status: "completed",
          arguments: '{"city":"Paris"}',
        },
      } as unknown as Schema["RealtimeServerEvent"],
      ROOM,
    );

    // Sub-agent is fire-and-forget, wait a tick
    await new Promise((r) => setTimeout(r, 50));

    expect(fakes.subAgent.execute).toHaveBeenCalled();
    const config = (fakes.subAgent.execute.mock.calls[0] as unknown[])?.[0] as {
      functionName: string;
      mcpServerUrl: string;
    };
    expect(config.functionName).toBe("get_weather");
    expect(config.mcpServerUrl).toBe("http://mcp.test");
  });

  it("should inject result via sendToRoom after sub-agent completes", async () => {
    await fakes.service.processMessage(
      {
        type: "response.output_item.done",
        item: {
          type: "function_call",
          id: "fc-inject",
          call_id: "cid-6",
          name: "search_customer",
          status: "completed",
          arguments: '{"name":"John"}',
        },
      } as unknown as Schema["RealtimeServerEvent"],
      ROOM,
    );

    // Wait for fire-and-forget to resolve
    await new Promise((r) => setTimeout(r, 100));

    // sendToRoom should have been called with the result injection
    expect(sendToRoom).toHaveBeenCalled();
  });
});
