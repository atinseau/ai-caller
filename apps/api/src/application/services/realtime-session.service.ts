import type { Schema } from "@ai-caller/shared";
import { inject, injectable } from "inversify";
import type { IRoomModel } from "@/domain/models/room.model";
import { LoggerPort } from "@/domain/ports/logger.port";
import { RealtimeSessionPort } from "@/domain/ports/realtime-session.port";
import { SubAgentPort } from "@/domain/ports/sub-agent.port";
import { TextStreamPort } from "@/domain/ports/text-stream.port";
import { ToolRepositoryPort } from "@/domain/repositories/tool-repository.port";
import { CallServicePort } from "@/domain/services/call-service.port";
import { env } from "@/infrastructure/config/env";
import { AiToolEnum } from "@/interfaces/enums/ai-tool.enum";

type SendToRoomFn = (event: Schema["RealtimeClientEvent"]) => void;

type SessionState = {
  shouldCloseCall: boolean;
  companyMcpUrl?: string;
  sendToRoom?: SendToRoomFn;
};

@injectable()
export class RealtimeSessionService implements RealtimeSessionPort {
  private readonly sessionState: Map<string, SessionState> = new Map();

  constructor(
    @inject(CallServicePort) private readonly callService: CallServicePort,
    @inject(ToolRepositoryPort)
    private readonly toolRepository: ToolRepositoryPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
    @inject(TextStreamPort) private readonly textStream: TextStreamPort,
    @inject(SubAgentPort) private readonly subAgent: SubAgentPort,
  ) {}

  initSession(
    roomId: string,
    companyMcpUrl?: string,
    sendToRoom?: SendToRoomFn,
  ): void {
    this.sessionState.set(roomId, {
      shouldCloseCall: false,
      companyMcpUrl,
      sendToRoom,
    });
  }

  destroySession(roomId: string): void {
    this.sessionState.delete(roomId);
    this.textStream.close(roomId);
  }

  async processMessage(
    message: Schema["RealtimeServerEvent"],
    room: IRoomModel,
  ): Promise<Schema["RealtimeClientEvent"][]> {
    if (message.type === "response.output_text.delta") {
      this.textStream.publish(room.id, {
        type: "text_delta",
        text: message.delta ?? "",
      });
      return [];
    }

    if (message.type === "response.output_text.done") {
      this.textStream.publish(room.id, {
        type: "text_done",
        text: message.text ?? "",
      });
      return [];
    }

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
    if (
      message.type === "output_audio_buffer.stopped" &&
      state?.shouldCloseCall
    ) {
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
      await this.toolRepository.createToolInvoke(
        room.id,
        item.id,
        item.name,
        args,
      );
    }

    return this.buildUnblockMessages();
  }

  private async handleFunctionCall(
    item: Schema["RealtimeConversationItemFunctionCall"],
    room: IRoomModel,
  ): Promise<Schema["RealtimeClientEvent"][]> {
    if (!item.id || item.status !== "completed") {
      this.logger.warn(
        `Function call item with ID ${item.id} has unhandled status: ${item.status}`,
      );
      return [];
    }

    if (item.name === AiToolEnum.CALL_CLOSE) {
      const state = this.sessionState.get(room.id);
      if (state) state.shouldCloseCall = true;
      this.logger.info(`Close call requested for room ${room.id}`);
      return this.buildUnblockMessages();
    }

    if (item.name === AiToolEnum.GET_TOOL_STATUS) {
      return this.handleGetToolStatus(item, room);
    }

    return this.handleSubAgentDispatch(item, room);
  }

  private async handleGetToolStatus(
    item: Schema["RealtimeConversationItemFunctionCall"],
    room: IRoomModel,
  ): Promise<Schema["RealtimeClientEvent"][]> {
    const args = item.arguments
      ? (JSON.parse(item.arguments) as { tool_invoke_id?: string })
      : {};

    const toolInvoke = args.tool_invoke_id
      ? await this.toolRepository.findByEntityId(args.tool_invoke_id)
      : null;

    const output = toolInvoke
      ? {
          status: toolInvoke.status,
          toolName: toolInvoke.toolName,
          results: toolInvoke.results,
        }
      : { status: "NOT_FOUND" };

    return [
      {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: item.call_id,
          output: JSON.stringify(output),
        },
      } as Schema["RealtimeClientEvent"],
      { type: "response.create" } as Schema["RealtimeClientEvent"],
    ];
  }

  private async handleSubAgentDispatch(
    item: Schema["RealtimeConversationItemFunctionCall"],
    room: IRoomModel,
  ): Promise<Schema["RealtimeClientEvent"][]> {
    const state = this.sessionState.get(room.id);
    const args = item.arguments
      ? (JSON.parse(item.arguments) as Record<string, unknown>)
      : {};

    const toolInvoke = await this.toolRepository.createToolInvoke(
      room.id,
      item.id!,
      item.name,
      args,
    );

    if (state?.companyMcpUrl && state.sendToRoom) {
      const { sendToRoom } = state;
      this.subAgent
        .execute({
          model: env.get("SUB_AGENT_MODEL"),
          roomId: room.id,
          toolInvokeId: toolInvoke.entityId,
          functionName: item.name!,
          functionArgs: args,
          mcpServerUrl: state.companyMcpUrl,
        })
        .then((result) => {
          sendToRoom({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `[Tool result for ${item.name}]: ${result.summary}`,
                },
              ],
            },
          } as Schema["RealtimeClientEvent"]);
          sendToRoom({
            type: "response.create",
          } as Schema["RealtimeClientEvent"]);
        })
        .catch((err) => {
          this.logger.error(
            err,
            `Sub-agent failed for ${item.name} in room ${room.id}`,
          );
        });
    }

    this.logger.info(
      `Sub-agent dispatched for ${item.name} in room ${room.id}`,
    );

    return [
      {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: item.call_id,
          output: JSON.stringify({
            status: "processing",
            tool_invoke_id: toolInvoke.entityId,
          }),
        },
      } as Schema["RealtimeClientEvent"],
      { type: "response.create" } as Schema["RealtimeClientEvent"],
    ];
  }

  private async buildUnblockMessages(): Promise<
    Schema["RealtimeClientEvent"][]
  > {
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
