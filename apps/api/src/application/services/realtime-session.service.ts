import type { Schema } from "@ai-caller/shared";
import { inject, injectable } from "inversify";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import type { RealtimeSessionPort } from "@/domain/ports/realtime-session.port.ts";
import { SubAgentPort } from "@/domain/ports/sub-agent.port.ts";
import { TextStreamPort } from "@/domain/ports/text-stream.port.ts";
import { RoomEventRepositoryPort } from "@/domain/repositories/room-event-repository.port.ts";
import { ToolRepositoryPort } from "@/domain/repositories/tool-repository.port.ts";
import { CallServicePort } from "@/domain/services/call-service.port.ts";
import { env } from "@/infrastructure/config/env.ts";
import { AiToolEnum } from "@/interfaces/enums/ai-tool.enum.ts";

type SendToRoomFn = (event: Schema["RealtimeClientEvent"]) => void;

type SessionState = {
  shouldCloseCall: boolean;
  companyMcpUrl?: string;
  sendToRoom?: SendToRoomFn;
  isTest?: boolean;
};

@injectable()
export class RealtimeSessionService implements RealtimeSessionPort {
  private readonly sessionState: Map<string, SessionState> = new Map();

  constructor(
    @inject(CallServicePort) private readonly callService: CallServicePort,
    @inject(ToolRepositoryPort)
    private readonly toolRepository: ToolRepositoryPort,
    @inject(RoomEventRepositoryPort)
    private readonly roomEventRepository: RoomEventRepositoryPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
    @inject(TextStreamPort) private readonly textStream: TextStreamPort,
    @inject(SubAgentPort) private readonly subAgent: SubAgentPort,
  ) {}

  initSession(
    roomId: string,
    companyMcpUrl?: string,
    sendToRoom?: SendToRoomFn,
    isTest?: boolean,
  ): void {
    this.sessionState.set(roomId, {
      shouldCloseCall: false,
      companyMcpUrl,
      sendToRoom,
      isTest,
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
    // biome-ignore lint/suspicious/noExplicitAny: audio transcript events not yet in shared schema
    const msg = message as any;

    if (msg.type === "response.audio_transcript.delta") {
      const text = (msg.delta as string | undefined) ?? "";
      this.textStream.publish(room.id, {
        type: "agent_transcript_delta",
        text,
      });
      return [];
    }

    if (msg.type === "response.audio_transcript.done") {
      const text = (msg.transcript as string | undefined) ?? "";
      this.textStream.publish(room.id, {
        type: "agent_transcript_done",
        text,
      });
      await this.roomEventRepository.create(room.id, "AGENT_TRANSCRIPT", {
        text,
      });
      return [];
    }

    if (msg.type === "conversation.item.input_audio_transcription.completed") {
      const text = (msg.transcript as string | undefined) ?? "";
      this.textStream.publish(room.id, { type: "user_transcript", text });
      await this.roomEventRepository.create(room.id, "USER_TRANSCRIPT", {
        text,
      });
      return [];
    }

    if (message.type === "response.output_text.delta") {
      const text = message.delta ?? "";
      this.textStream.publish(room.id, { type: "text_delta", text });
      await this.roomEventRepository.create(room.id, "TEXT_DELTA", { text });
      return [];
    }

    if (message.type === "response.output_text.done") {
      const text = message.text ?? "";
      this.textStream.publish(room.id, { type: "text_done", text });
      await this.roomEventRepository.create(room.id, "TEXT_DONE", { text });
      return [];
    }

    if (message.type === "response.output_item.done") {
      if (message.item.type === "function_call") {
        return this.handleFunctionCall(message.item, room);
      }

      if (
        message.item.type === "message" &&
        message.item.role === "assistant"
      ) {
        // biome-ignore lint/suspicious/noExplicitAny: content type varies between output_text and output_audio
        const content = (message.item as any).content as
          | { type?: string; text?: string; transcript?: string }[]
          | undefined;
        const text =
          content
            ?.map((c) => c.transcript ?? c.text ?? "")
            .filter(Boolean)
            .join("") ?? "";
        if (text) {
          this.textStream.publish(room.id, {
            type: "agent_transcript_done",
            text,
          });
          await this.roomEventRepository.create(room.id, "AGENT_TRANSCRIPT", {
            text,
          });
        }
        return [];
      }
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

  private handleFunctionCall(
    item: Schema["RealtimeConversationItemFunctionCall"],
    room: IRoomModel,
  ): Promise<Schema["RealtimeClientEvent"][]> {
    if (!item.id || item.status !== "completed") {
      this.logger.warn(
        `Function call item with ID ${item.id} has unhandled status: ${item.status}`,
      );
      return Promise.resolve([]);
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
    _room: IRoomModel,
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
    if (!item.id || !item.name) return [];

    const args = item.arguments
      ? (JSON.parse(item.arguments) as Record<string, unknown>)
      : {};

    const toolInvoke = await this.toolRepository.createToolInvoke(
      room.id,
      item.id,
      item.name,
      args,
    );

    this.textStream.publish(room.id, {
      type: "tool_invoke_created",
      toolInvoke,
    });
    await this.roomEventRepository.create(room.id, "TOOL_INVOKE_CREATED", {
      toolInvoke,
    });

    if (state?.sendToRoom && state.isTest) {
      const mockSummary = `[TEST] ${item.name} executed successfully (mocked)`;
      const completed = await this.toolRepository.completeToolInvokeByEntityId(
        toolInvoke.entityId,
        { summary: mockSummary },
      );
      this.textStream.publish(room.id, {
        type: "tool_invoke_updated",
        toolInvoke: completed,
      });
      await this.roomEventRepository.create(room.id, "TOOL_INVOKE_UPDATED", {
        toolInvoke: completed,
      });

      this.logger.info(
        `Test mock completed for ${item.name} in room ${room.id}`,
      );

      return [
        {
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: item.call_id,
            output: JSON.stringify({
              status: "completed",
              result: mockSummary,
            }),
          },
        } as Schema["RealtimeClientEvent"],
        { type: "response.create" } as Schema["RealtimeClientEvent"],
      ];
    }

    if (state?.companyMcpUrl && state.sendToRoom) {
      const { sendToRoom } = state;
      this.subAgent
        .execute({
          model: env.get("SUB_AGENT_MODEL"),
          roomId: room.id,
          toolInvokeId: toolInvoke.entityId,
          functionName: item.name,
          functionArgs: args,
          mcpServerUrl: state.companyMcpUrl,
        })
        .then(async (result) => {
          const completed = await this.toolRepository.findByEntityId(
            toolInvoke.entityId,
          );
          if (completed) {
            this.textStream.publish(room.id, {
              type: "tool_invoke_updated",
              toolInvoke: completed,
            });
            await this.roomEventRepository.create(
              room.id,
              "TOOL_INVOKE_UPDATED",
              { toolInvoke: completed },
            );
          }

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
        .catch(async (err) => {
          this.logger.error(
            err,
            `Sub-agent failed for ${item.name} in room ${room.id}`,
          );
          const existing = await this.toolRepository
            .findByEntityId(toolInvoke.entityId)
            .catch(() => null);
          if (existing && existing.status === "RUNNING") {
            const failed = await this.toolRepository.failToolInvoke(
              toolInvoke.id,
            );
            this.textStream.publish(room.id, {
              type: "tool_invoke_updated",
              toolInvoke: failed,
            });
            await this.roomEventRepository.create(
              room.id,
              "TOOL_INVOKE_UPDATED",
              { toolInvoke: failed },
            );
          }
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
