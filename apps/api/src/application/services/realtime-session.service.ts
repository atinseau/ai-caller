import { inject, injectable } from "inversify";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import type {
  AudioProviderConnection,
  NormalizedAudioEvent,
} from "@/domain/ports/audio-provider.port.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import type { RealtimeSessionPort } from "@/domain/ports/realtime-session.port.ts";
import { TextStreamPort } from "@/domain/ports/text-stream.port.ts";
import { RoomEventRepositoryPort } from "@/domain/repositories/room-event-repository.port.ts";
import { CallServicePort } from "@/domain/services/call-service.port.ts";
import { AiToolEnum } from "@/interfaces/enums/ai-tool.enum.ts";
import { ToolExecutionService } from "./tool-execution.service.ts";

/** Extra margin (ms) added to the computed audio drain delay */
const DRAIN_MARGIN_MS = 500;

type SessionState = {
  shouldCloseCall: boolean;
  companyMcpUrl?: string;
  connection?: AudioProviderConnection;
  isTest?: boolean;
  onSessionEnd?: () => void;
  getAudioDrainMs?: () => number;
};

@injectable()
export class RealtimeSessionService implements RealtimeSessionPort {
  private readonly sessionState: Map<string, SessionState> = new Map();

  constructor(
    @inject(CallServicePort) private readonly callService: CallServicePort,
    @inject(RoomEventRepositoryPort)
    private readonly roomEventRepository: RoomEventRepositoryPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
    @inject(TextStreamPort) private readonly textStream: TextStreamPort,
    @inject(ToolExecutionService)
    private readonly toolExecution: ToolExecutionService,
  ) {}

  initSession(
    roomId: string,
    companyMcpUrl?: string,
    connection?: AudioProviderConnection,
    isTest?: boolean,
    onSessionEnd?: () => void,
    getAudioDrainMs?: () => number,
  ): void {
    this.sessionState.set(roomId, {
      shouldCloseCall: false,
      companyMcpUrl,
      connection,
      isTest,
      onSessionEnd,
      getAudioDrainMs,
    });
  }

  destroySession(roomId: string): void {
    this.sessionState.delete(roomId);
    this.textStream.close(roomId);
  }

  async processEvent(
    event: NormalizedAudioEvent,
    room: IRoomModel,
  ): Promise<void> {
    if (event.type === "transcript.delta" && event.role === "agent") {
      this.textStream.publish(room.id, {
        type: "agent_transcript_delta",
        text: event.text,
      });
      return;
    }

    if (event.type === "transcript.done" && event.role === "agent") {
      this.textStream.publish(room.id, {
        type: "agent_transcript_done",
        text: event.text,
      });
      // Fire-and-forget: DB writes are for audit/compaction, not real-time
      this.roomEventRepository
        .create(room.id, "AGENT_TRANSCRIPT", { text: event.text })
        .catch((err) =>
          this.logger.error(
            err as object,
            `Failed to persist AGENT_TRANSCRIPT for room ${room.id}`,
          ),
        );
      return;
    }

    if (event.type === "transcript.done" && event.role === "user") {
      this.textStream.publish(room.id, {
        type: "user_transcript",
        text: event.text,
      });
      // Fire-and-forget: DB writes are for audit/compaction, not real-time
      this.roomEventRepository
        .create(room.id, "USER_TRANSCRIPT", { text: event.text })
        .catch((err) =>
          this.logger.error(
            err as object,
            `Failed to persist USER_TRANSCRIPT for room ${room.id}`,
          ),
        );
      return;
    }

    if (event.type === "function_call") {
      await this.handleFunctionCall(event, room);
      return;
    }

    const state = this.sessionState.get(room.id);
    if (event.type === "response.done" && state?.shouldCloseCall) {
      await this.callService.terminateCall(room);

      // Wait for the client to finish playing buffered audio before closing
      const drainMs = (state.getAudioDrainMs?.() ?? 0) + DRAIN_MARGIN_MS;
      this.logger.info(
        `Draining ${drainMs}ms of audio before closing room ${room.id}`,
      );
      setTimeout(() => state.onSessionEnd?.(), drainMs);
    }
  }

  private async handleFunctionCall(
    event: Extract<NormalizedAudioEvent, { type: "function_call" }>,
    room: IRoomModel,
  ): Promise<void> {
    const state = this.sessionState.get(room.id);
    const connection = state?.connection;

    if (event.name === AiToolEnum.CALL_CLOSE) {
      if (state) state.shouldCloseCall = true;
      this.logger.info(`Close call requested for room ${room.id}`);
      // Must send function result so the provider can proceed to response.done
      connection?.sendFunctionResult(
        event.callId,
        JSON.stringify({ status: "ok", message: "Call will be closed." }),
      );
      return;
    }

    if (event.name === AiToolEnum.GET_TOOL_STATUS) {
      await this.handleGetToolStatus(event, connection);
      return;
    }

    await this.handleSubAgentDispatch(event, room);
  }

  private async handleGetToolStatus(
    event: Extract<NormalizedAudioEvent, { type: "function_call" }>,
    connection?: AudioProviderConnection,
  ): Promise<void> {
    const args = event.arguments
      ? (JSON.parse(event.arguments) as { tool_invoke_id?: string })
      : {};

    const output = await this.toolExecution.getToolStatus(
      args.tool_invoke_id ?? "",
    );

    connection?.sendFunctionResult(event.callId, JSON.stringify(output));
  }

  private async handleSubAgentDispatch(
    event: Extract<NormalizedAudioEvent, { type: "function_call" }>,
    room: IRoomModel,
  ): Promise<void> {
    const state = this.sessionState.get(room.id);
    const connection = state?.connection;

    const args = event.arguments
      ? (JSON.parse(event.arguments) as Record<string, unknown>)
      : {};

    const result = await this.toolExecution.dispatch({
      roomId: room.id,
      callId: event.callId,
      toolName: event.name,
      args,
      mcpUrl: state?.companyMcpUrl,
      isTest: state?.isTest && !!connection,
      onResult: (toolName, summary) => {
        connection?.sendText(`[Tool result for ${toolName}]: ${summary}`);
      },
    });

    if (result.immediate === "completed" && result.mockSummary) {
      connection?.sendFunctionResult(
        event.callId,
        JSON.stringify({
          status: "completed",
          result: result.mockSummary,
        }),
      );
      return;
    }

    connection?.sendFunctionResult(
      event.callId,
      JSON.stringify({
        status: "processing",
        tool_invoke_id: result.toolInvoke.entityId,
      }),
    );
  }
}
