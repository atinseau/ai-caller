/**
 * Mock MCP Server for integration tests.
 * Implements a minimal MCP-compatible HTTP endpoint that returns predictable responses.
 */

const MOCK_TOOLS = [
  {
    name: "search_customer",
    description: "Search for a customer by name",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Customer name to search" },
      },
      required: ["name"],
    },
  },
  {
    name: "get_weather",
    description: "Get the current weather for a location",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name" },
      },
      required: ["city"],
    },
  },
];

const MOCK_RESULTS: Record<string, unknown> = {
  search_customer: {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          id: 1,
          name: "John Doe",
          email: "john@example.com",
        }),
      },
    ],
  },
  get_weather: {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          city: "Paris",
          temperature: 22,
          condition: "sunny",
        }),
      },
    ],
  },
};

export class MockMcpServer {
  private server: ReturnType<typeof Bun.serve> | null = null;
  public port = 0;

  get url(): string {
    return `http://localhost:${this.port}/mcp`;
  }

  async start(): Promise<void> {
    this.server = Bun.serve({
      port: 0, // auto-assign
      fetch: async (req) => {
        const url = new URL(req.url);

        if (req.method !== "POST" || !url.pathname.endsWith("/mcp")) {
          return new Response("Not Found", { status: 404 });
        }

        const body = (await req.json()) as {
          method: string;
          params?: { name?: string; arguments?: Record<string, unknown> };
          id?: number;
          jsonrpc: string;
        };

        if (body.method === "initialize") {
          return Response.json({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              protocolVersion: "2025-03-26",
              capabilities: { tools: {} },
              serverInfo: { name: "mock-mcp", version: "1.0.0" },
            },
          });
        }

        if (body.method === "tools/list") {
          return Response.json({
            jsonrpc: "2.0",
            id: body.id,
            result: { tools: MOCK_TOOLS },
          });
        }

        if (body.method === "tools/call") {
          const toolName = body.params?.name ?? "";
          const result = MOCK_RESULTS[toolName] ?? {
            content: [{ type: "text", text: "Unknown tool" }],
          };
          return Response.json({
            jsonrpc: "2.0",
            id: body.id,
            result,
          });
        }

        return Response.json({
          jsonrpc: "2.0",
          id: body.id,
          error: { code: -32601, message: "Method not found" },
        });
      },
    });

    this.port = this.server.port ?? 0;
  }

  stop(): void {
    this.server?.stop();
    this.server = null;
  }
}
