import { inject, injectable } from "inversify";
import type { ICompanyModel } from "@/domain/models/company.model.ts";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { RealtimeSessionPort } from "@/domain/ports/realtime-session.port.ts";
import type { TelephonyGatewayPort } from "@/domain/ports/telephony-gateway.port.ts";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port.ts";
import { env } from "@/infrastructure/config/env.ts";

type TelephonySession = {
  openaiWs: WebSocket;
  sendToTwilio: (message: Record<string, unknown>) => void;
  streamSid: string;
  room: IRoomModel;
  /** Tracks how many audio bytes we've sent to Twilio for interruption handling */
  audioBytesSent: number;
  /** Counter for mark labels */
  markCounter: number;
  /** Last mark label we sent */
  lastMarkLabel: string;
};

@injectable()
export class TwilioMediaGateway implements TelephonyGatewayPort {
  private readonly sessions: Map<string, TelephonySession> = new Map();

  constructor(
    @inject(RealtimeSessionPort)
    private readonly sessionService: RealtimeSessionPort,
    @inject(RoomRepositoryPort)
    private readonly roomRepository: RoomRepositoryPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
  ) {}

  async initCall(
    roomId: string,
    _company: ICompanyModel,
    sessionConfig: Record<string, unknown>,
    sendToTwilio: (message: Record<string, unknown>) => void,
    mcpUrl?: string,
    isTest?: boolean,
  ): Promise<void> {
    const apiKey = env.get("OPENAI_API_KEY");

    const wsOptions = {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    };
    const openaiWs = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-realtime-1.5",
      // biome-ignore lint/suspicious/noExplicitAny: Bun WebSocket typings don't include headers option
      wsOptions as any,
    );

    const room = await this.roomRepository.findById(roomId);

    const session: TelephonySession = {
      openaiWs,
      sendToTwilio,
      streamSid: room.twilioStreamSid ?? "",
      room,
      audioBytesSent: 0,
      markCounter: 0,
      lastMarkLabel: "",
    };

    this.sessions.set(roomId, session);

    // Initialize RealtimeSessionService with sendToOpenAI callback
    const sendToOpenAI = (event: Record<string, unknown>) => {
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.send(JSON.stringify(event));
      }
    };

    this.sessionService.initSession(
      roomId,
      mcpUrl,
      sendToOpenAI as never,
      isTest,
    );

    openaiWs.onopen = () => {
      this.logger.info(`[Telephony] OpenAI WS opened for room ${roomId}`);

      // Configure session for telephony audio format (g711_ulaw)
      const telephonyConfig = {
        ...sessionConfig,
        input_audio_format: "g711_ulaw",
        output_audio_format: "g711_ulaw",
      };

      openaiWs.send(
        JSON.stringify({
          type: "session.update",
          session: telephonyConfig,
        }),
      );
    };

    openaiWs.onmessage = async (event) => {
      const data = JSON.parse(typeof event.data === "string" ? event.data : "");

      // Handle audio output → forward to Twilio
      if (data.type === "response.audio.delta" && data.delta) {
        sendToTwilio({
          event: "media",
          streamSid: session.streamSid,
          media: { payload: data.delta },
        });
        session.audioBytesSent += data.delta.length;

        // Send a mark after each audio chunk for playback tracking
        session.markCounter++;
        session.lastMarkLabel = `mark-${session.markCounter}`;
        sendToTwilio({
          event: "mark",
          streamSid: session.streamSid,
          mark: { name: session.lastMarkLabel },
        });
        return;
      }

      // Handle interruptions
      if (data.type === "input_audio_buffer.speech_started") {
        // Clear Twilio playback buffer
        sendToTwilio({
          event: "clear",
          streamSid: session.streamSid,
        });
        session.audioBytesSent = 0;
        return;
      }

      // All other events → process via RealtimeSessionService
      try {
        const responses = await this.sessionService.processMessage(
          data,
          session.room,
        );
        for (const response of responses) {
          sendToOpenAI(response as Record<string, unknown>);
        }
      } catch (error) {
        this.logger.error(
          `[Telephony] Error processing message for room ${roomId}: ${error}`,
        );
      }
    };

    openaiWs.onerror = (event) => {
      this.logger.error(
        `[Telephony] OpenAI WS error for room ${roomId}: ${event}`,
      );
    };

    openaiWs.onclose = () => {
      this.logger.info(`[Telephony] OpenAI WS closed for room ${roomId}`);
      this.cleanup(roomId);
    };
  }

  forwardAudioToOpenAI(roomId: string, base64Audio: string): void {
    const session = this.sessions.get(roomId);
    if (!session || session.openaiWs.readyState !== WebSocket.OPEN) return;

    session.openaiWs.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: base64Audio,
      }),
    );
  }

  handleMark(roomId: string, _markName: string): void {
    // Mark events confirm playback position — used for interruption calculation
    // Currently tracked via audioBytesSent counter
    const session = this.sessions.get(roomId);
    if (!session) return;
    // Marks confirm the Twilio side has played up to this point
  }

  closeCall(roomId: string): void {
    const session = this.sessions.get(roomId);
    if (!session) return;

    if (session.openaiWs.readyState === WebSocket.OPEN) {
      session.openaiWs.close();
    }

    this.cleanup(roomId);
  }

  private cleanup(roomId: string): void {
    this.sessionService.destroySession(roomId);
    this.sessions.delete(roomId);
  }
}
