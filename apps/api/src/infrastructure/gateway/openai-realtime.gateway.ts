import type { Schema } from "@ai-caller/shared";
import { inject, injectable } from "inversify";
import { merge } from "lodash-es";

import type { RealtimeGatewayPort } from "@/application/ports/realtime-gateway.port";
import type { IRoomModel } from "@/domain/models/room.model";
import { ToolRepositoryPort } from "@/domain/repositories/tool-repository.port";
import { CallServicePort } from "@/domain/services/call-service.port";
import { logger } from "../logger";

type ChannelData = {
  shouldCloseCall: boolean;
};

@injectable()
export class OpenAIRealtimeGateway implements RealtimeGatewayPort {
  private readonly connectionMap: Map<string, WebSocket> = new Map();
  private readonly channelDataMap: Map<string, ChannelData> = new Map();

  constructor(
    @inject(CallServicePort) private readonly callService: CallServicePort,
    @inject(ToolRepositoryPort)
    private readonly toolRepository: ToolRepositoryPort,
  ) {}

  public async openRoomChannel(room: IRoomModel) {
    if (!room.callId) {
      logger.error(`Room ${room.id} does not have a call ID.`);
      return;
    }

    const ws = new WebSocket(
      `wss://api.openai.com/v1/realtime?call_id=${room.callId}`,
      {
        headers: {
          Authorization: `Bearer ${room.token}`,
        },
        // biome-ignore lint/suspicious/noExplicitAny: Bad typing from WebSocket lib
      } as any,
    );

    ws.onopen = () => {
      logger.info(`WebSocket connection opened for call ID: ${room.callId}`);
    };

    ws.onerror = (event) => {
      logger.error(event, `WebSocket error for call ID ${room.callId}`);
    };

    ws.onmessage = (event) =>
      this.handleMessage(ws, JSON.parse(event.data), room);

    ws.onclose = () => {
      this.connectionMap.delete(room.id);
      this.channelDataMap.delete(room.id);
      logger.info(`WebSocket connection closed for call ID: ${room.callId}`);
    };

    this.connectionMap.set(room.id, ws);

    // Initialize channel data
    this.channelDataMap.set(room.id, {
      shouldCloseCall: false,
    });
  }

  private handleMessage(
    ws: WebSocket,
    data: Schema["RealtimeServerEvent"],
    room: IRoomModel,
  ) {
    if (
      data.type === "response.output_item.done" &&
      data.item.type === "mcp_call"
    )
      return this.handleMcpCall(ws, data.item, room);

    if (
      data.type === "response.output_item.done" &&
      data.item.type === "function_call"
    )
      return this.handleFunctionCall(ws, data.item, room);

    const channelData = this.channelDataMap.get(room.id);

    if (
      data.type === "output_audio_buffer.stopped" &&
      channelData?.shouldCloseCall
    )
      return this.callService.terminateCall(room);
  }

  private async handleFunctionCall(
    ws: WebSocket,
    item: Schema["RealtimeConversationItemFunctionCall"],
    room: IRoomModel,
  ) {
    if (item.id && item.status === "completed") {
      this.updateChannelData(room.id, { shouldCloseCall: true });
      this.autoUnblockConversation(ws);

      logger.info(
        `Handled function call done for room ${room.id}, item ID: ${item.id}`,
      );
      return;
    }

    logger.warn(
      `Function call item with ID ${item.id} has unhandled status: ${item.status}`,
    );
  }

  private async handleMcpCall(
    ws: WebSocket,
    item: Schema["RealtimeMCPToolCall"],
    room: IRoomModel,
  ) {
    console.log(item);

    this.autoUnblockConversation(ws);
    logger.info(
      item.output,
      `Handled MCP call done for room ${room.id}, item ID: ${item.id}`,
    );
  }

  private async autoUnblockConversation(ws: WebSocket) {
    // Simulate a short delay before sending the next messages
    await Bun.sleep(300);

    this.sendMessage(ws, {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            detail: "auto",
            text: "", // Empty message to trigger next step
          },
        ],
      },
    });

    this.sendMessage(ws, {
      type: "response.create",
    });
  }

  private sendMessage(ws: WebSocket, message: Schema["RealtimeClientEvent"]) {
    ws.send(JSON.stringify(message));
  }

  private updateChannelData(roomId: string, data: Partial<ChannelData>) {
    const existingData = this.channelDataMap.get(roomId);
    this.channelDataMap.set(roomId, merge(existingData, data));
  }
}
