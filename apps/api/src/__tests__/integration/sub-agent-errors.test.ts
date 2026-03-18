import {
  describe,
  expect,
  it,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  setDefaultTimeout,
} from "bun:test";
import type { TextStreamEvent } from "@/domain/ports/text-stream.port";
import { SubAgentService } from "@/application/services/sub-agent.service";
import { McpClientAdapter } from "@/infrastructure/mcp/mcp-client.adapter";
import { InMemoryTextStream } from "@/infrastructure/stream/in-memory-text-stream";
import { HandlebarsPromptAdapter } from "@/infrastructure/prompt/handlebars-prompt.adapter";
import { createTestContext } from "../helpers/test-context";
import {
  createTestCompany,
  setupTestEnvironment,
  teardownTestEnvironment,
} from "../helpers/setup";
import { ToolRepositoryPort } from "@/domain/repositories/tool-repository.port";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import { CallServicePort } from "@/domain/services/call-service.port";

setDefaultTimeout(15_000);

let mcpUrl: string;

beforeAll(async () => {
  const env = await setupTestEnvironment();
  mcpUrl = env.mcpUrl;
});

afterAll(() => teardownTestEnvironment());

const ctx = createTestContext();
beforeEach(ctx.setup);
afterEach(ctx.teardown);

const noopLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
} as never;

describe("SubAgentService — error paths", () => {
  async function createTestRoom() {
    ctx.container.rebind(CallServicePort).toConstantValue({
      createCall: async () => ({
        token: `err-test-${Date.now()}`,
        expiresAt: new Date(Date.now() + 60_000),
      }),
      terminateCall: async () => {},
    });

    const company = await createTestCompany(ctx.container, mcpUrl);
    const roomRepo = ctx.container.get(RoomRepositoryPort);
    return roomRepo.createRoom(
      company.id,
      `err-token-${Date.now()}`,
      new Date(Date.now() + 60_000),
      "TEXT",
    );
  }

  it("should mark ToolInvoke as FAILED when MCP server is unreachable", async () => {
    const room = await createTestRoom();
    const toolRepo = ctx.container.get(ToolRepositoryPort);
    const toolInvoke = await toolRepo.createToolInvoke(
      room.id,
      "fail-entity-1",
      "search_customer",
    );

    const textStream = new InMemoryTextStream();
    const subAgent = new SubAgentService(
      new McpClientAdapter(),
      toolRepo,
      textStream,
      noopLogger,
      new HandlebarsPromptAdapter(),
    );

    let thrown = false;
    try {
      await subAgent.execute({
        model: "gpt-4o-mini",
        roomId: room.id,
        toolInvokeId: toolInvoke.entityId,
        functionName: "search_customer",
        functionArgs: { name: "John" },
        mcpServerUrl: "http://localhost:1/unreachable",
      });
    } catch {
      thrown = true;
    }

    expect(thrown).toBe(true);

    const updated = await toolRepo.findByEntityId("fail-entity-1");
    expect(updated?.status).toBe("FAILED");
  });

  it("should publish RUNNING then FAILED to TextStream on error", async () => {
    const room = await createTestRoom();
    const toolRepo = ctx.container.get(ToolRepositoryPort);
    const toolInvoke = await toolRepo.createToolInvoke(
      room.id,
      "fail-entity-2",
      "get_weather",
    );

    const textStream = new InMemoryTextStream();
    const events: TextStreamEvent[] = [];
    const iter = textStream.subscribe(room.id);
    const collector = (async () => {
      for await (const e of iter) {
        events.push(e);
        if ("status" in e && e.status === "FAILED") break;
      }
    })();

    const subAgent = new SubAgentService(
      new McpClientAdapter(),
      toolRepo,
      textStream,
      noopLogger,
      new HandlebarsPromptAdapter(),
    );

    try {
      await subAgent.execute({
        model: "gpt-4o-mini",
        roomId: room.id,
        toolInvokeId: toolInvoke.entityId,
        functionName: "get_weather",
        functionArgs: { city: "Paris" },
        mcpServerUrl: "http://localhost:1/unreachable",
      });
    } catch {
      // expected
    }

    await collector;

    const statusEvents = events.filter((e) => e.type === "tool_status");
    expect(statusEvents).toHaveLength(2);
    expect((statusEvents[0] as { status: string }).status).toBe("RUNNING");
    expect((statusEvents[1] as { status: string }).status).toBe("FAILED");
  });
});
