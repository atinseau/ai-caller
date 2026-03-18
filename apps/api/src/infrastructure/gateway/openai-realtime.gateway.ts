import type { Schema } from "@ai-caller/shared";
import { inject, injectable } from "inversify";
import type { IRoomModel } from "@/domain/models/room.model";
import type { RealtimeGatewayPort } from "@/domain/ports/realtime-gateway.port";
import { RealtimeSessionPort } from "@/domain/ports/realtime-session.port";
import { logger } from "../logger";

@injectable()
export class OpenAIRealtimeGateway implements RealtimeGatewayPort {
  private readonly connectionMap: Map<string, WebSocket> = new Map();

  constructor(
    @inject(RealtimeSessionPort)
    private readonly sessionService: RealtimeSessionPort,
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

    this.sessionService.initSession(room.id);

    ws.onopen = () => {
      logger.info(`WebSocket connection opened for call ID: ${room.callId}`);
    };

    ws.onerror = (event) => {
      logger.error(event, `WebSocket error for call ID ${room.callId}`);
    };

    ws.onmessage = async (event) => {
      const messages = await this.sessionService.processMessage(
        JSON.parse(event.data),
        room,
      );
      for (const msg of messages) {
        this.sendMessage(ws, msg);
      }
    };

    ws.onclose = () => {
      this.sessionService.destroySession(room.id);
      this.connectionMap.delete(room.id);
      logger.info(`WebSocket connection closed for call ID: ${room.callId}`);
    };

    this.connectionMap.set(room.id, ws);
  }

  private sendMessage(ws: WebSocket, message: Schema["RealtimeClientEvent"]) {
    ws.send(JSON.stringify(message));
  }
}
