import { describe, expect, it } from "bun:test";
import { McpClientAdapter } from "@/infrastructure/mcp/mcp-client.adapter";
import { McpToolDiscoveryService } from "@/application/services/mcp-tool-discovery.service";
import { MockMcpServer } from "../helpers/mock-mcp-server";

const mockLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
};

describe("Tool Invocation", () => {
  describe("McpToolDiscoveryService", () => {
    it("should discover MCP tools and convert to realtime function format", async () => {
      const server = new MockMcpServer();
      await server.start();

      try {
        const mcpClient = new McpClientAdapter();
        const discovery = new McpToolDiscoveryService(
          mcpClient,
          mockLogger as never,
        );

        const functions =
          await discovery.discoverAsRealtimeFunctions(server.url);

        expect(functions).toHaveLength(2);

        expect(functions[0]!).toEqual({
          type: "function",
          name: "search_customer",
          description: "Search for a customer by name",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Customer name to search" },
            },
            required: ["name"],
          },
        });

        expect(functions[1]!).toEqual({
          type: "function",
          name: "get_weather",
          description: "Get the current weather for a location",
          parameters: {
            type: "object",
            properties: {
              city: { type: "string", description: "City name" },
            },
            required: ["city"],
          },
        });
      } finally {
        server.stop();
      }
    });
  });

  describe("MCP Tool Execution", () => {
    it("should call search_customer and return structured result", async () => {
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
        const content = result as { type: string; text: string }[];
        expect(content[0]!.type).toBe("text");

        const parsed = JSON.parse(content[0]!.text);
        expect(parsed.id).toBe(1);
        expect(parsed.name).toBe("John Doe");
      } finally {
        server.stop();
      }
    });

    it("should call get_weather and return structured result", async () => {
      const server = new MockMcpServer();
      await server.start();

      try {
        const client = new McpClientAdapter();
        await client.connect(server.url);
        const result = await client.callTool("get_weather", {
          city: "Paris",
        });
        await client.disconnect();

        const content = result as { type: string; text: string }[];
        const parsed = JSON.parse(content[0]!.text);
        expect(parsed.city).toBe("Paris");
        expect(parsed.temperature).toBe(22);
        expect(parsed.condition).toBe("sunny");
      } finally {
        server.stop();
      }
    });

    it("should handle unknown tools gracefully", async () => {
      const server = new MockMcpServer();
      await server.start();

      try {
        const client = new McpClientAdapter();
        await client.connect(server.url);
        const result = await client.callTool("nonexistent_tool", {});
        await client.disconnect();

        expect(result).toBeDefined();
        const content = result as { type: string; text: string }[];
        expect(content[0]!.text).toBe("Unknown tool");
      } finally {
        server.stop();
      }
    });
  });
});
