import { inject, injectable } from "inversify";
import { LoggerPort } from "@/domain/ports/logger.port";
import { McpClientPort } from "@/domain/ports/mcp-client.port";

export type RealtimeFunctionTool = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

@injectable()
export class McpToolDiscoveryService {
  constructor(
    @inject(McpClientPort) private readonly mcpClient: McpClientPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
  ) {}

  async discoverAsRealtimeFunctions(
    mcpServerUrl: string,
  ): Promise<RealtimeFunctionTool[]> {
    await this.mcpClient.connect(mcpServerUrl);
    const tools = await this.mcpClient.listTools();
    await this.mcpClient.disconnect();

    this.logger.info(
      `Discovered ${tools.length} MCP tools from ${mcpServerUrl}`,
    );

    return tools.map((tool) => ({
      type: "function" as const,
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }
}
