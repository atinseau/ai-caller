import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ToolExecutionService } from "@/application/services/tool-execution.service.ts";
import type { TextStreamEvent } from "@/domain/ports/text-stream.port.ts";

function createFakes() {
  const publishedEvents: { roomId: string; event: TextStreamEvent }[] = [];
  const createdInvokes: unknown[][] = [];

  const toolRepository = {
    createToolInvoke: mock(
      (roomId: string, callId: string, toolName: string, args: unknown) => {
        createdInvokes.push([roomId, callId, toolName, args]);
        return Promise.resolve({
          id: "inv-1",
          entityId: callId,
          roomId,
          toolName,
          status: "RUNNING",
          createdAt: new Date(),
        });
      },
    ),
    completeToolInvokeByEntityId: mock((entityId: string, results: unknown) =>
      Promise.resolve({
        id: "inv-1",
        entityId,
        roomId: "room-1",
        toolName: "test_tool",
        status: "COMPLETED",
        results,
        createdAt: new Date(),
      }),
    ),
    failToolInvoke: mock((id: string) =>
      Promise.resolve({
        id,
        entityId: "e-1",
        roomId: "room-1",
        toolName: "test_tool",
        status: "FAILED",
        createdAt: new Date(),
      }),
    ),
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
  };

  const roomEventRepository = {
    create: mock(() => Promise.resolve({})),
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

  const subAgent = {
    execute: mock(() =>
      Promise.resolve({
        toolInvokeId: "e-1",
        summary: "Customer found",
        rawResult: {},
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

  const service = new ToolExecutionService(
    toolRepository as never,
    roomEventRepository as never,
    textStream as never,
    subAgent as never,
    logger as never,
  );

  return {
    service,
    toolRepository,
    subAgent,
    publishedEvents,
    createdInvokes,
    roomEventRepository,
  };
}

describe("ToolExecutionService", () => {
  let fakes: ReturnType<typeof createFakes>;

  beforeEach(() => {
    fakes = createFakes();
  });

  describe("dispatch", () => {
    it("should create a ToolInvoke and publish tool_invoke_created", async () => {
      const onResult = mock(() => {
        /* noop */
      });
      await fakes.service.dispatch({
        roomId: "room-1",
        callId: "fc-1",
        toolName: "search_customer",
        args: { name: "John" },
        mcpUrl: "http://mcp.test",
        onResult,
      });

      expect(fakes.toolRepository.createToolInvoke).toHaveBeenCalledWith(
        "room-1",
        "fc-1",
        "search_customer",
        { name: "John" },
      );

      const createdEvent = fakes.publishedEvents.find(
        (e) => e.event.type === "tool_invoke_created",
      );
      expect(createdEvent).toBeDefined();
    });

    it("should return processing for prod dispatch", async () => {
      const onResult = mock(() => {
        /* noop */
      });
      const result = await fakes.service.dispatch({
        roomId: "room-1",
        callId: "fc-1",
        toolName: "search_customer",
        args: {},
        mcpUrl: "http://mcp.test",
        onResult,
      });

      expect(result.immediate).toBe("processing");
      expect(result.toolInvoke.entityId).toBe("fc-1");
    });

    it("should mock dispatch in test mode and call onResult", async () => {
      const onResult = mock(() => {
        /* noop */
      });
      const result = await fakes.service.dispatch({
        roomId: "room-1",
        callId: "fc-test",
        toolName: "search_customer",
        args: {},
        isTest: true,
        onResult,
      });

      expect(result.immediate).toBe("completed");
      expect(result.mockSummary).toContain("[TEST]");
      expect(onResult).toHaveBeenCalled();
    });

    it("should call subAgent.execute for prod dispatch", async () => {
      const onResult = mock(() => {
        /* noop */
      });
      await fakes.service.dispatch({
        roomId: "room-1",
        callId: "fc-prod",
        toolName: "get_weather",
        args: { city: "Paris" },
        mcpUrl: "http://mcp.test",
        onResult,
      });

      // Sub-agent is fire-and-forget, wait a tick
      await new Promise((r) => setTimeout(r, 50));

      expect(fakes.subAgent.execute).toHaveBeenCalled();
    });

    it("should call onResult after sub-agent completes", async () => {
      const onResult = mock(() => {
        /* noop */
      });
      await fakes.service.dispatch({
        roomId: "room-1",
        callId: "fc-result",
        toolName: "search_customer",
        args: {},
        mcpUrl: "http://mcp.test",
        onResult,
      });

      await new Promise((r) => setTimeout(r, 100));

      expect(onResult).toHaveBeenCalledWith(
        "search_customer",
        "Customer found",
      );
    });
  });

  describe("getToolStatus", () => {
    it("should return tool status for existing invoke", async () => {
      const status = await fakes.service.getToolStatus("e-1");
      expect(status.status).toBe("COMPLETED");
      expect(status.toolName).toBe("search_customer");
    });

    it("should return NOT_FOUND for non-existing invoke", async () => {
      (
        fakes.toolRepository.findByEntityId as {
          mockReturnValue: (v: unknown) => void;
        }
      ).mockReturnValue(Promise.resolve(null));
      const status = await fakes.service.getToolStatus("non-existent");
      expect(status.status).toBe("NOT_FOUND");
    });
  });
});
