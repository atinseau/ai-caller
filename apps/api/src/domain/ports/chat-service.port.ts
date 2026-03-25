export type ChatStreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "text_done"; text: string }
  | {
      type: "tool_call";
      toolName: string;
      callId: string;
      args: Record<string, unknown>;
    }
  | { type: "error"; message: string };

export type ChatTool = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export abstract class ChatServicePort {
  abstract initSession(
    roomId: string,
    instructions: string,
    tools: ChatTool[],
    mcpUrl?: string,
    isTest?: boolean,
  ): void;

  abstract sendMessage(
    roomId: string,
    userText: string,
  ): AsyncIterable<ChatStreamEvent>;

  abstract destroySession(roomId: string): void;
}
