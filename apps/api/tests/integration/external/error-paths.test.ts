import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { McpClientAdapter } from "@/infrastructure/mcp/mcp-client.adapter.ts";

setDefaultTimeout(15_000);

describe("Error Paths", () => {
  describe("MCP Client errors", () => {
    it("should throw when calling tool on disconnected client", () => {
      const client = new McpClientAdapter();
      expect(client.callTool("anything", {})).rejects.toThrow();
    });

    it("should throw when listing tools on disconnected client", () => {
      const client = new McpClientAdapter();
      expect(client.listTools()).rejects.toThrow();
    });

    it("should throw when connecting to unreachable server", () => {
      const client = new McpClientAdapter();
      expect(
        client.connect("http://localhost:1/nonexistent"),
      ).rejects.toThrow();
    });
  });
});
