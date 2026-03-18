import type { Schema } from "@ai-caller/shared";
import { inject, injectable } from "inversify";
import type { IRoomModel } from "@/domain/models/room.model";
import { LoggerPort } from "@/domain/ports/logger.port";
import { RealtimeSessionPort } from "@/domain/ports/realtime-session.port";
import { ToolRepositoryPort } from "@/domain/repositories/tool-repository.port";
import { CallServicePort } from "@/domain/services/call-service.port";

type SessionState = {
  shouldCloseCall: boolean;
};

@injectable()
export class RealtimeSessionService implements RealtimeSessionPort {
  private readonly sessionState: Map<string, SessionState> = new Map();

  constructor(
    @inject(CallServicePort) private readonly callService: CallServicePort,
    @inject(ToolRepositoryPort)
    private readonly toolRepository: ToolRepositoryPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
  ) {}

  initSession(roomId: string): void {
    this.sessionState.set(roomId, { shouldCloseCall: false });
  }

  destroySession(roomId: string): void {
    this.sessionState.delete(roomId);
  }

  async processMessage(
    message: Schema["RealtimeServerEvent"],
    room: IRoomModel,
  ): Promise<Schema["RealtimeClientEvent"][]> {
    if (
      message.type === "response.output_item.done" &&
      message.item.type === "mcp_call"
    ) {
      return this.handleMcpCall(message.item, room);
    }

    if (
      message.type === "response.output_item.done" &&
      message.item.type === "function_call"
    ) {
      return this.handleFunctionCall(message.item, room);
    }

    const state = this.sessionState.get(room.id);
    if (message.type === "output_audio_buffer.stopped" && state?.shouldCloseCall) {
      await this.callService.terminateCall(room);
    }

    return [];
  }

  private async handleMcpCall(
    item: Schema["RealtimeMCPToolCall"],
    room: IRoomModel,
  ): Promise<Schema["RealtimeClientEvent"][]> {
    this.logger.info(
      item.output ?? {},
      `MCP call done for room ${room.id}, item ID: ${item.id}`,
    );

    if (item.id) {
      const args =
        typeof item.arguments === "string"
          ? (JSON.parse(item.arguments) as Record<string, unknown>)
          : (item.arguments as Record<string, unknown>);
      await this.toolRepository.createToolInvoke(room.id, item.id, args);
    }

    return this.buildUnblockMessages();
  }

  private async handleFunctionCall(
    item: Schema["RealtimeConversationItemFunctionCall"],
    room: IRoomModel,
  ): Promise<Schema["RealtimeClientEvent"][]> {
    if (item.id && item.status === "completed") {
      const state = this.sessionState.get(room.id);
      if (state) state.shouldCloseCall = true;

      this.logger.info(
        `Function call done for room ${room.id}, item ID: ${item.id}`,
      );
      return this.buildUnblockMessages();
    }

    this.logger.warn(
      `Function call item with ID ${item.id} has unhandled status: ${item.status}`,
    );
    return [];
  }

  private async buildUnblockMessages(): Promise<Schema["RealtimeClientEvent"][]> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return [
      {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", detail: "auto", text: "" }],
        },
      } as Schema["RealtimeClientEvent"],
      { type: "response.create" } as Schema["RealtimeClientEvent"],
    ];
  }
}
