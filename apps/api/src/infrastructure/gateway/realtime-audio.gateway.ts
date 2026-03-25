import { inject, injectable } from "inversify";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import type {
  AudioProviderConfig,
  AudioProviderConnection,
} from "@/domain/ports/audio-provider.port.ts";
import { AudioProviderPort } from "@/domain/ports/audio-provider.port.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import type {
  ClientSender,
  RealtimeGatewayPort,
} from "@/domain/ports/realtime-gateway.port.ts";
import { RealtimeSessionPort } from "@/domain/ports/realtime-session.port.ts";

/** PCM16 = 2 bytes per sample, 24 kHz sample rate for browser audio */
const BROWSER_BYTES_PER_SAMPLE = 2;
const BROWSER_SAMPLE_RATE = 24_000;

@injectable()
export class RealtimeAudioGateway implements RealtimeGatewayPort {
  private readonly connectionMap: Map<string, AudioProviderConnection> =
    new Map();
  private readonly clientSenderMap: Map<string, ClientSender> = new Map();
  /** Tracks decoded audio bytes forwarded to the browser (for drain calculation) */
  private readonly audioBytesForwardedMap: Map<string, number> = new Map();

  constructor(
    @inject(AudioProviderPort)
    private readonly audioProvider: AudioProviderPort,
    @inject(RealtimeSessionPort)
    private readonly sessionService: RealtimeSessionPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
  ) {
    // Periodic cleanup of stale connections (every 60s)
    setInterval(() => this.cleanupStaleConnections(), 60_000);
  }

  private cleanupStaleConnections(): void {
    for (const roomId of this.connectionMap.keys()) {
      if (!this.clientSenderMap.has(roomId)) {
        this.logger.warn(
          `Cleaning up stale audio connection for room ${roomId}`,
        );
        this.closeRoomChannel(roomId);
      }
    }
  }

  async openRoomChannel(
    room: IRoomModel,
    config: AudioProviderConfig,
  ): Promise<void> {
    if (room.modality === "TEXT") {
      this.logger.warn(
        `Room ${room.id} is TEXT modality — should use ChatServicePort, not RealtimeGateway`,
      );
      return;
    }

    let connection: AudioProviderConnection;
    try {
      connection = await this.audioProvider.connect(config);
    } catch (error) {
      this.logger.error(
        error as object,
        `Failed to connect audio provider for room ${room.id}`,
      );
      return;
    }

    this.connectionMap.set(room.id, connection);
    this.audioBytesForwardedMap.set(room.id, 0);

    this.sessionService.initSession(
      room.id,
      config.mcpUrl,
      connection,
      config.isTest ?? room.isTest,
      () => this.closeRoomChannel(room.id),
      () => this.getAudioDrainMs(room.id),
    );

    connection.onEvent((event) => {
      const sendToClient = this.clientSenderMap.get(room.id);

      // Forward audio chunks to the browser client + track bytes
      if (event.type === "audio.delta" && sendToClient) {
        sendToClient({ type: "audio", audio: event.base64 });
        // Track decoded bytes: base64 encodes 3 bytes per 4 chars
        const decodedBytes = (event.base64.length / 4) * 3;
        this.audioBytesForwardedMap.set(
          room.id,
          (this.audioBytesForwardedMap.get(room.id) ?? 0) + decodedBytes,
        );
        return;
      }

      // Forward interruption signal so the browser clears its playback buffer
      if (event.type === "speech_started" && sendToClient) {
        sendToClient({ type: "interrupt" });
        // Reset audio counter — client cleared its buffer
        this.audioBytesForwardedMap.set(room.id, 0);
        return;
      }

      // All other events → process via RealtimeSessionService
      this.sessionService.processEvent(event, room).catch((err) => {
        this.logger.error(
          err as object,
          `Error processing event for room ${room.id}`,
        );
      });
    });

    this.logger.info(
      `Audio provider connected for room ${room.id} (${room.modality})`,
    );
  }

  forwardAudioToProvider(roomId: string, base64Audio: string): void {
    const connection = this.connectionMap.get(roomId);
    if (!connection) {
      this.logger.warn(`No audio provider connection for room ${roomId}`);
      return;
    }
    connection.sendAudio(base64Audio);
  }

  sendTextToProvider(roomId: string, text: string): void {
    const connection = this.connectionMap.get(roomId);
    if (!connection) {
      this.logger.warn(`No audio provider connection for room ${roomId}`);
      return;
    }
    connection.sendText(text);
  }

  registerClientSender(roomId: string, sender: ClientSender): void {
    this.clientSenderMap.set(roomId, sender);
  }

  unregisterClientSender(roomId: string): void {
    this.clientSenderMap.delete(roomId);
  }

  closeRoomChannel(roomId: string): void {
    const connection = this.connectionMap.get(roomId);
    if (connection) {
      // Notify browser client that the session is ending
      const sendToClient = this.clientSenderMap.get(roomId);
      if (sendToClient) {
        sendToClient({ type: "close" });
      }

      connection.close();
      this.connectionMap.delete(roomId);
      this.clientSenderMap.delete(roomId);
      this.audioBytesForwardedMap.delete(roomId);
      this.sessionService.destroySession(roomId);
      this.logger.info(`Room channel closed for room ${roomId}`);
    }
  }

  /** Calculate remaining audio playback time in ms based on bytes forwarded */
  private getAudioDrainMs(roomId: string): number {
    const bytes = this.audioBytesForwardedMap.get(roomId) ?? 0;
    return (bytes / BROWSER_BYTES_PER_SAMPLE / BROWSER_SAMPLE_RATE) * 1000;
  }
}
