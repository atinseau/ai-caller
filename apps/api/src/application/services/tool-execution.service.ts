import { inject, injectable } from "inversify";
import type { IToolInvokeModel } from "@/domain/models/tool.model.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { SubAgentPort } from "@/domain/ports/sub-agent.port.ts";
import { TextStreamPort } from "@/domain/ports/text-stream.port.ts";
import { RoomEventRepositoryPort } from "@/domain/repositories/room-event-repository.port.ts";
import { ToolRepositoryPort } from "@/domain/repositories/tool-repository.port.ts";
import { env } from "@/infrastructure/config/env.ts";

export type ToolDispatchResult = {
  toolInvoke: IToolInvokeModel;
  immediate: "processing" | "completed";
  /** For test mode: the mock summary */
  mockSummary?: string;
};

export type ToolStatusResult = {
  status: string;
  toolName?: string;
  results?: unknown;
};

export type ToolDispatchParams = {
  roomId: string;
  callId: string;
  toolName: string;
  args: Record<string, unknown>;
  mcpUrl?: string;
  isTest?: boolean;
  onResult: (toolName: string, summary: string) => void;
  onError?: (toolName: string, error: string) => void;
};

/**
 * Shared service for tool execution logic.
 * Used by both RealtimeSessionService (AUDIO) and OpenAIChatService (TEXT).
 * Transport-agnostic: the caller provides callbacks for result injection.
 */
@injectable()
export class ToolExecutionService {
  constructor(
    @inject(ToolRepositoryPort)
    private readonly toolRepository: ToolRepositoryPort,
    @inject(RoomEventRepositoryPort)
    private readonly roomEventRepository: RoomEventRepositoryPort,
    @inject(TextStreamPort) private readonly textStream: TextStreamPort,
    @inject(SubAgentPort) private readonly subAgent: SubAgentPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
  ) {}

  /**
   * Dispatch a tool call. Creates a ToolInvoke record, publishes events,
   * and either mocks (test) or dispatches to SubAgent (prod).
   * The onResult/onError callbacks are invoked asynchronously when the tool completes.
   */
  async dispatch(params: ToolDispatchParams): Promise<ToolDispatchResult> {
    const {
      roomId,
      callId,
      toolName,
      args,
      mcpUrl,
      isTest,
      onResult,
      onError,
    } = params;

    const toolInvoke = await this.toolRepository.createToolInvoke(
      roomId,
      callId,
      toolName,
      args,
    );

    this.textStream.publish(roomId, {
      type: "tool_invoke_created",
      toolInvoke,
    });
    await this.roomEventRepository.create(roomId, "TOOL_INVOKE_CREATED", {
      toolInvoke,
    });

    if (isTest) {
      return this.handleTestDispatch(roomId, toolInvoke, toolName, onResult);
    }

    if (mcpUrl) {
      this.handleProdDispatch(
        roomId,
        toolInvoke,
        toolName,
        args,
        mcpUrl,
        onResult,
        onError,
      );
    }

    this.logger.info(`Sub-agent dispatched for ${toolName} in room ${roomId}`);

    return { toolInvoke, immediate: "processing" };
  }

  /**
   * Check the status of a running tool invocation.
   */
  async getToolStatus(toolInvokeId: string): Promise<ToolStatusResult> {
    const toolInvoke = await this.toolRepository.findByEntityId(toolInvokeId);

    if (!toolInvoke) {
      return { status: "NOT_FOUND" };
    }

    return {
      status: toolInvoke.status,
      toolName: toolInvoke.toolName,
      results: toolInvoke.results,
    };
  }

  private async handleTestDispatch(
    roomId: string,
    toolInvoke: IToolInvokeModel,
    toolName: string,
    onResult: (toolName: string, summary: string) => void,
  ): Promise<ToolDispatchResult> {
    const mockSummary = `[TEST] ${toolName} executed successfully (mocked)`;
    const completed = await this.toolRepository.completeToolInvokeByEntityId(
      toolInvoke.entityId,
      { summary: mockSummary },
    );

    this.textStream.publish(roomId, {
      type: "tool_invoke_updated",
      toolInvoke: completed,
    });
    await this.roomEventRepository.create(roomId, "TOOL_INVOKE_UPDATED", {
      toolInvoke: completed,
    });

    this.logger.info(`Test mock completed for ${toolName} in room ${roomId}`);

    onResult(toolName, mockSummary);

    return { toolInvoke, immediate: "completed", mockSummary };
  }

  private handleProdDispatch(
    roomId: string,
    toolInvoke: IToolInvokeModel,
    toolName: string,
    args: Record<string, unknown>,
    mcpUrl: string,
    onResult: (toolName: string, summary: string) => void,
    onError?: (toolName: string, error: string) => void,
  ): void {
    this.subAgent
      .execute({
        model: env.get("SUB_AGENT_MODEL"),
        roomId,
        toolInvokeId: toolInvoke.entityId,
        functionName: toolName,
        functionArgs: args,
        mcpServerUrl: mcpUrl,
      })
      .then(async (result) => {
        const completed = await this.toolRepository.findByEntityId(
          toolInvoke.entityId,
        );
        if (completed) {
          this.textStream.publish(roomId, {
            type: "tool_invoke_updated",
            toolInvoke: completed,
          });
          await this.roomEventRepository.create(roomId, "TOOL_INVOKE_UPDATED", {
            toolInvoke: completed,
          });
        }

        onResult(toolName, result.summary);
      })
      .catch(async (err) => {
        this.logger.error(
          err,
          `Sub-agent failed for ${toolName} in room ${roomId}`,
        );
        const existing = await this.toolRepository
          .findByEntityId(toolInvoke.entityId)
          .catch(() => null);
        if (existing && existing.status === "RUNNING") {
          const failed = await this.toolRepository.failToolInvoke(
            toolInvoke.id,
          );
          this.textStream.publish(roomId, {
            type: "tool_invoke_updated",
            toolInvoke: failed,
          });
          await this.roomEventRepository.create(roomId, "TOOL_INVOKE_UPDATED", {
            toolInvoke: failed,
          });
        }

        onError?.(toolName, err instanceof Error ? err.message : String(err));
      });
  }
}
