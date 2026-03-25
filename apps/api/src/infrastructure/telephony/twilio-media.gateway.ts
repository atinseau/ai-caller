import { inject, injectable } from "inversify";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import type {
  AudioProviderConfig,
  AudioProviderConnection,
} from "@/domain/ports/audio-provider.port.ts";
import { AudioProviderPort } from "@/domain/ports/audio-provider.port.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { RealtimeSessionPort } from "@/domain/ports/realtime-session.port.ts";
import type { TelephonyGatewayPort } from "@/domain/ports/telephony-gateway.port.ts";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port.ts";

type TelephonySession = {
  connection: AudioProviderConnection;
  sendToTwilio: (message: Record<string, unknown>) => void;
  streamSid: string;
  room: IRoomModel;
  /** Tracks base64 string length of audio sent to Twilio */
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
    @inject(AudioProviderPort)
    private readonly audioProvider: AudioProviderPort,
    @inject(RealtimeSessionPort)
    private readonly sessionService: RealtimeSessionPort,
    @inject(RoomRepositoryPort)
    private readonly roomRepository: RoomRepositoryPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
  ) {}

  async initCall(
    roomId: string,
    config: AudioProviderConfig,
    sendToTwilio: (message: Record<string, unknown>) => void,
  ): Promise<void> {
    // Force g711_ulaw format for telephony
    const telephonyConfig: AudioProviderConfig = {
      ...config,
      inputAudioFormat: { type: "audio/pcmu", rate: 8000 },
      outputAudioFormat: { type: "audio/pcmu", rate: 8000 },
    };

    const connection = await this.audioProvider.connect(telephonyConfig);

    const room = await this.roomRepository.findById(roomId);

    const session: TelephonySession = {
      connection,
      sendToTwilio,
      streamSid: room.twilioStreamSid ?? "",
      room,
      audioBytesSent: 0,
      markCounter: 0,
      lastMarkLabel: "",
    };

    this.sessions.set(roomId, session);

    // Initialize RealtimeSessionService with the connection
    this.sessionService.initSession(
      roomId,
      config.mcpUrl,
      connection,
      config.isTest,
      () => this.closeCall(roomId),
      () => this.getAudioDrainMs(roomId),
    );

    // Subscribe to normalized events
    connection.onEvent((event) => {
      // Handle audio output → forward to Twilio
      if (event.type === "audio.delta") {
        sendToTwilio({
          event: "media",
          streamSid: session.streamSid,
          media: { payload: event.base64 },
        });
        session.audioBytesSent += event.base64.length;

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
      if (event.type === "speech_started") {
        // Clear Twilio playback buffer
        sendToTwilio({
          event: "clear",
          streamSid: session.streamSid,
        });
        session.audioBytesSent = 0;
        return;
      }

      // All other events → process via RealtimeSessionService
      this.sessionService.processEvent(event, session.room).catch((error) => {
        this.logger.error(
          `[Telephony] Error processing event for room ${roomId}: ${error}`,
        );
      });
    });

    this.logger.info(`[Telephony] Audio provider connected for room ${roomId}`);
  }

  forwardAudio(roomId: string, base64Audio: string): void {
    const session = this.sessions.get(roomId);
    if (!session) return;
    session.connection.sendAudio(base64Audio);
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

    session.connection.close();
    this.cleanup(roomId);
  }

  /** Calculate remaining audio playback time in ms based on bytes sent to Twilio */
  private getAudioDrainMs(roomId: string): number {
    const session = this.sessions.get(roomId);
    if (!session) return 0;
    // audioBytesSent is base64 string length; decode to actual bytes
    const decodedBytes = (session.audioBytesSent / 4) * 3;
    // PCMU = 1 byte per sample, 8kHz
    return (decodedBytes / 1 / 8000) * 1000;
  }

  private cleanup(roomId: string): void {
    this.sessionService.destroySession(roomId);
    this.sessions.delete(roomId);
  }
}
