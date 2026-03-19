import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { injectable } from "inversify";
import type {
  McpClientPort,
  McpToolDefinition,
} from "@/domain/ports/mcp-client.port.ts";

@injectable()
export class McpClientAdapter implements McpClientPort {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;

  async connect(serverUrl: string): Promise<void> {
    this.client = new Client({
      name: "ai-caller-agent",
      version: "1.0.0",
    });

    this.transport = new StreamableHTTPClientTransport(new URL(serverUrl));
    await this.client.connect(this.transport);
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
    }
    this.client = null;
    this.transport = null;
  }

  async listTools(): Promise<McpToolDefinition[]> {
    if (!this.client) throw new Error("MCP client not connected");

    const result = await this.client.listTools();
    return result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description ?? "",
      parameters: (tool.inputSchema as Record<string, unknown>) ?? {},
    }));
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    if (!this.client) throw new Error("MCP client not connected");

    const result = await this.client.callTool({ name, arguments: args });
    return result.content;
  }
}
