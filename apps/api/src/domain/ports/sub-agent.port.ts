export type SubAgentConfig = {
  model: string;
  roomId: string;
  toolInvokeId: string;
  functionName: string;
  functionArgs: Record<string, unknown>;
  mcpServerUrl: string;
};

export type SubAgentResult = {
  toolInvokeId: string;
  summary: string;
  rawResult: unknown;
};

export abstract class SubAgentPort {
  abstract execute(config: SubAgentConfig): Promise<SubAgentResult>;
}
