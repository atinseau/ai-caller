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

setDefaultTimeout(30_000);

import type { TextStreamEvent } from "@/domain/ports/text-stream.port";
import { SubAgentService } from "@/application/services/sub-agent.service";
import { McpClientAdapter } from "@/infrastructure/mcp/mcp-client.adapter";
import { InMemoryTextStream } from "@/infrastructure/stream/in-memory-text-stream";
import { HandlebarsPromptAdapter } from "@/infrastructure/prompt/handlebars-prompt.adapter";
import { createTestContext } from "@/tests/helpers/test-context";
import {
  createTestCompany,
  setupTestEnvironment,
  teardownTestEnvironment,
} from "@/tests/helpers/setup";
import { ToolRepositoryPort } from "@/domain/repositories/tool-repository.port";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import { CallServicePort } from "@/domain/services/call-service.port";

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

describe("SubAgentService (real OpenAI chat + mock MCP)", () => {
  it("should execute full pipeline: MCP call → summarize via gpt-4o-mini → complete tool invoke", async () => {
    ctx.container.rebind(CallServicePort).toConstantValue({
      createCall: async () => ({
        token: `sub-agent-test-${Date.now()}`,
        expiresAt: new Date(Date.now() + 60_000),
      }),
      terminateCall: async () => {},
    });

    const company = await createTestCompany(ctx.container, mcpUrl);
    const roomRepo = ctx.container.get(RoomRepositoryPort);
    const room = await roomRepo.createRoom(
      company.id,
      `sub-agent-token-${Date.now()}`,
      new Date(Date.now() + 60_000),
      "TEXT",
    );

    const toolRepo = ctx.container.get(ToolRepositoryPort);
    const toolInvoke = await toolRepo.createToolInvoke(
      room.id,
      "test-entity-1",
      "search_customer",
    );

    // Collect text stream events
    const textStream = new InMemoryTextStream();
    const events: TextStreamEvent[] = [];
    const iter = textStream.subscribe(room.id);
    const collector = (async () => {
      for await (const e of iter) {
        events.push(e);
        if ("status" in e && e.status === "COMPLETED") break;
      }
    })();

    const subAgent = new SubAgentService(
      new McpClientAdapter(),
      toolRepo,
      textStream,
      noopLogger,
      new HandlebarsPromptAdapter(),
    );

    const result = await subAgent.execute({
      model: "gpt-4o-mini",
      roomId: room.id,
      toolInvokeId: toolInvoke.entityId,
      functionName: "search_customer",
      functionArgs: { name: "John" },
      mcpServerUrl: mcpUrl,
    });

    await collector;

    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.rawResult).toBeDefined();

    const completed = await toolRepo.findByEntityId("test-entity-1");
    expect(completed?.status).toBe("COMPLETED");

    expect(
      events.some(
        (e) => e.type === "tool_status" && "status" in e && e.status === "RUNNING",
      ),
    ).toBe(true);
    expect(
      events.some(
        (e) => e.type === "tool_status" && "status" in e && e.status === "COMPLETED",
      ),
    ).toBe(true);
  });
});
