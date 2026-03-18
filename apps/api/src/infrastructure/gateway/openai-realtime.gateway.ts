import type { Schema } from "@ai-caller/shared";
import { inject, injectable } from "inversify";
import type { IRoomModel } from "@/domain/models/room.model";
import type { RealtimeGatewayPort } from "@/domain/ports/realtime-gateway.port";
import { RealtimeSessionPort } from "@/domain/ports/realtime-session.port";
import { env } from "../config/env";
import { logger } from "../logger";

@injectable()
export class OpenAIRealtimeGateway implements RealtimeGatewayPort {
  private readonly connectionMap: Map<string, WebSocket> = new Map();

  constructor(
    @inject(RealtimeSessionPort)
    private readonly sessionService: RealtimeSessionPort,
  ) {}

  public async openRoomChannel(room: IRoomModel, companyMcpUrl?: string) {
    if (room.modality === "TEXT") {
      return this.openTextChannel(room, companyMcpUrl);
    }
    return this.openAudioChannel(room, companyMcpUrl);
  }

  public sendToRoom(
    roomId: string,
    event: Schema["RealtimeClientEvent"],
  ): void {
    const ws = this.connectionMap.get(roomId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.warn(`No open WebSocket connection for room ${roomId}`);
      return;
    }
    ws.send(JSON.stringify(event));
  }

  public closeRoomChannel(roomId: string): void {
    const ws = this.connectionMap.get(roomId);
    if (ws) {
      ws.close();
      this.connectionMap.delete(roomId);
      this.sessionService.destroySession(roomId);
      logger.info(`Room channel closed for room ${roomId}`);
    }
  }

  private async openAudioChannel(room: IRoomModel, companyMcpUrl?: string) {
    if (!room.callId) {
      logger.error(`Room ${room.id} does not have a call ID.`);
      return;
    }

    const ws = this.connectWebSocket(
      `wss://api.openai.com/v1/realtime?call_id=${room.callId}`,
      room.token,
    );

    this.setupChannel(ws, room, undefined, companyMcpUrl);
  }

  private async openTextChannel(room: IRoomModel, companyMcpUrl?: string) {
    const ws = this.connectWebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-realtime-1.5",
      env.get("OPENAI_API_KEY"),
    );

    this.setupChannel(
      ws,
      room,
      () => {
        this.sendToRoom(room.id, {
          type: "session.update",
          session: {
            type: "realtime",
            output_modalities: ["text"],
          },
        } as Schema["RealtimeClientEvent"]);
      },
      companyMcpUrl,
    );
  }

  private connectWebSocket(url: string, token: string): WebSocket {
    return new WebSocket(url, {
      headers: { Authorization: `Bearer ${token}` },
      // biome-ignore lint/suspicious/noExplicitAny: Bad typing from WebSocket lib
    } as any);
  }

  private setupChannel(
    ws: WebSocket,
    room: IRoomModel,
    onOpen?: () => void,
    companyMcpUrl?: string,
  ) {
    this.sessionService.initSession(room.id, companyMcpUrl, (event) =>
      this.sendToRoom(room.id, event),
    );

    ws.onopen = () => {
      logger.info(
        `WebSocket connection opened for room ${room.id} (${room.modality})`,
      );
      onOpen?.();
    };

    ws.onerror = (event) => {
      logger.error(event, `WebSocket error for room ${room.id}`);
    };

    ws.onmessage = async (event) => {
      const messages = await this.sessionService.processMessage(
        JSON.parse(event.data),
        room,
      );
      for (const msg of messages) {
        this.sendToRoom(room.id, msg);
      }
    };

    ws.onclose = () => {
      this.sessionService.destroySession(room.id);
      this.connectionMap.delete(room.id);
      logger.info(`WebSocket connection closed for room ${room.id}`);
    };

    this.connectionMap.set(room.id, ws);
  }
}
