import { OpenAI, type Schema } from "@ai-caller/shared";
import { injectable } from "inversify";
import { merge } from "lodash-es";

import type { RealtimeGatewayPort } from "@/application/ports/realtime-gateway.port";
import type { IRoomModel } from "@/domain/models/room.model";
import { logger } from "../logger";

type ChannelData = {
  shouldCloseCall: boolean;
};

@injectable()
export class OpenAIRealtimeGateway implements RealtimeGatewayPort {
  private readonly connectionMap: Map<string, WebSocket> = new Map();
  private readonly channelDataMap: Map<string, ChannelData> = new Map();

  // ------ Public ------

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

  private async terminateCall(room: IRoomModel) {
    const openai = new OpenAI({ apiKey: room.token });
    if (!room.callId) {
      logger.error(`Room ${room.id} does not have a call ID.`);
      return;
    }

    const result = await openai.realtime.hangups(room.callId);
    if (!result) {
      logger.error(`Failed to hang up call for room ${room.id}`);
      return;
    }

    logger.info(`Call hung up for room ${room.id}`);
  }

  // ------ Private ------

  private handleMessage(
    ws: WebSocket,
    data: Schema["RealtimeServerEvent"],
    room: IRoomModel,
  ) {
    if (
      data.type === "response.output_item.done" &&
      data.item.type === "mcp_call"
    )
      return this.handleMcpCallDone(ws, data.item, room);

    if (
      data.type === "response.output_item.done" &&
      data.item.type === "function_call" &&
      data.item.status === "completed"
    )
      return this.handleFunctionCallDone(ws, data.item, room);

    const channelData = this.channelDataMap.get(room.id);

    if (
      data.type === "output_audio_buffer.stopped" &&
      channelData?.shouldCloseCall
    )
      return this.terminateCall(room);
  }

  private async handleFunctionCallDone(
    ws: WebSocket,
    item: Schema["RealtimeConversationItemFunctionCall"],
    room: IRoomModel,
  ) {
    this.updateChannelData(room.id, { shouldCloseCall: true });
    this.autoUnblockConversation(ws);
    logger.info(
      `Handled function call done for room ${room.id}, item ID: ${item.id}`,
    );
  }

  private async handleMcpCallDone(
    ws: WebSocket,
    item: Schema["RealtimeMCPToolCall"],
    room: IRoomModel,
  ) {
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
