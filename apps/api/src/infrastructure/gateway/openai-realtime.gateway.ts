import type { Schema } from "@ai-caller/shared";
import { inject, injectable } from "inversify";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import type { RealtimeGatewayPort } from "@/domain/ports/realtime-gateway.port.ts";
import { RealtimeSessionPort } from "@/domain/ports/realtime-session.port.ts";
import { env } from "../config/env.ts";
import { logger } from "../logger/index.ts";

@injectable()
export class OpenAIRealtimeGateway implements RealtimeGatewayPort {
  private readonly connectionMap: Map<string, WebSocket> = new Map();

  constructor(
    @inject(RealtimeSessionPort)
    private readonly sessionService: RealtimeSessionPort,
  ) {}

  public openRoomChannel(
    room: IRoomModel,
    companyMcpUrl?: string,
    isTest?: boolean,
    companyLanguage?: string,
    companyVadEagerness?: string,
  ) {
    if (room.modality === "TEXT") {
      return this.openTextChannel(room, companyMcpUrl, isTest);
    }
    return this.openAudioChannel(
      room,
      companyMcpUrl,
      isTest,
      companyLanguage,
      companyVadEagerness,
    );
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

  private openAudioChannel(
    room: IRoomModel,
    companyMcpUrl?: string,
    isTest?: boolean,
    companyLanguage?: string,
    companyVadEagerness?: string,
  ) {
    if (!room.callId) {
      logger.error(`Room ${room.id} does not have a call ID.`);
      return;
    }

    const ws = this.connectWebSocket(
      `wss://api.openai.com/v1/realtime?call_id=${room.callId}`,
      room.token,
    );

    this.setupChannel(
      ws,
      room,
      () => {
        // Enable input audio transcription and configure turn detection
        this.sendToRoom(room.id, {
          type: "session.update",
          session: {
            type: "realtime",
            input_audio_transcription: {
              model: "gpt-4o-mini-transcribe",
              ...(companyLanguage ? { language: companyLanguage } : {}),
            },
            turn_detection: {
              type: "semantic_vad",
              eagerness: companyVadEagerness ?? "medium",
              interrupt_response: true,
            },
          },
        } as unknown as Schema["RealtimeClientEvent"]);
      },
      companyMcpUrl,
      isTest,
    );
  }

  private openTextChannel(
    room: IRoomModel,
    companyMcpUrl?: string,
    isTest?: boolean,
  ) {
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
      isTest,
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
    isTest?: boolean,
  ) {
    this.sessionService.initSession(
      room.id,
      companyMcpUrl,
      (event) => this.sendToRoom(room.id, event),
      isTest,
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
