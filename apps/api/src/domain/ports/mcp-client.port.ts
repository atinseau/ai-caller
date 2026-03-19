export type McpToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export abstract class McpClientPort {
  abstract connect(serverUrl: string): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract listTools(): Promise<McpToolDefinition[]>;
  abstract callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown>;
  abstract checkConnectivity(serverUrl: string): Promise<boolean>;
}
