import { inject, injectable } from "inversify";
import { CachePort } from "@/domain/ports/cache.port.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { McpClientPort } from "@/domain/ports/mcp-client.port.ts";

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
    @inject(CachePort) private readonly cache: CachePort,
  ) {}

  async discoverAsRealtimeFunctions(
    mcpServerUrl: string,
  ): Promise<RealtimeFunctionTool[]> {
    const cacheKey = `mcp-tools:${mcpServerUrl}`;
    const cached = await this.cache.get<RealtimeFunctionTool[]>(cacheKey);
    if (cached) {
      this.logger.info(`MCP tools cache hit for ${mcpServerUrl}`);
      return cached;
    }

    await this.mcpClient.connect(mcpServerUrl);
    const tools = await this.mcpClient.listTools();
    await this.mcpClient.disconnect();

    const result = tools.map((tool) => ({
      type: "function" as const,
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    await this.cache.set(cacheKey, result, 600); // 10 minute TTL

    this.logger.info(
      `Discovered and cached ${tools.length} MCP tools from ${mcpServerUrl}`,
    );

    return result;
  }
}
