import { describe, expect, it } from "bun:test";
import { MockMcpServer } from "@/tests/helpers/mock-mcp-server";

describe("Connection Tests", () => {
  describe("Mock MCP Server", () => {
    it("should start and respond to tool listing", async () => {
      const server = new MockMcpServer();
      await server.start();

      try {
        const res = await fetch(server.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2025-03-26",
              capabilities: {},
              clientInfo: { name: "test", version: "1.0.0" },
            },
          }),
        });

        expect(res.ok).toBe(true);
        const data = (await res.json()) as {
          result: { serverInfo: { name: string } };
        };
        expect(data.result.serverInfo.name).toBe("mock-mcp");
      } finally {
        server.stop();
      }
    });

    it("should list available tools", async () => {
      const server = new MockMcpServer();
      await server.start();

      try {
        await fetch(server.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2025-03-26",
              capabilities: {},
              clientInfo: { name: "test", version: "1.0.0" },
            },
          }),
        });

        const res = await fetch(server.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 2,
            method: "tools/list",
          }),
        });

        expect(res.ok).toBe(true);
        const data = (await res.json()) as {
          result: { tools: { name: string }[] };
        };
        const tools = data.result.tools;
        expect(tools).toHaveLength(2);
        expect(tools[0]!.name).toBe("search_customer");
        expect(tools[1]!.name).toBe("get_weather");
      } finally {
        server.stop();
      }
    });

    it("should execute tool calls with predictable results", async () => {
      const server = new MockMcpServer();
      await server.start();

      try {
        const res = await fetch(server.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 3,
            method: "tools/call",
            params: {
              name: "search_customer",
              arguments: { name: "John" },
            },
          }),
        });

        expect(res.ok).toBe(true);
        const data = (await res.json()) as {
          result: { content: { type: string; text: string }[] };
        };
        const parsed = JSON.parse(data.result.content[0]!.text);
        expect(parsed.name).toBe("John Doe");
        expect(parsed.email).toBe("john@example.com");
      } finally {
        server.stop();
      }
    });
  });

  describe("MCP Client Adapter", () => {
    it("should connect to mock MCP server and list tools", async () => {
      const { McpClientAdapter } = await import(
        "@/infrastructure/mcp/mcp-client.adapter"
      );
      const server = new MockMcpServer();
      await server.start();

      try {
        const client = new McpClientAdapter();
        await client.connect(server.url);
        const tools = await client.listTools();
        await client.disconnect();

        expect(tools).toHaveLength(2);
        expect(tools[0]!.name).toBe("search_customer");
        expect(tools[1]!.name).toBe("get_weather");
      } finally {
        server.stop();
      }
    });

    it("should call tools and return results", async () => {
      const { McpClientAdapter } = await import(
        "@/infrastructure/mcp/mcp-client.adapter"
      );
      const server = new MockMcpServer();
      await server.start();

      try {
        const client = new McpClientAdapter();
        await client.connect(server.url);
        const result = await client.callTool("search_customer", {
          name: "John",
        });
        await client.disconnect();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      } finally {
        server.stop();
      }
    });
  });
});
