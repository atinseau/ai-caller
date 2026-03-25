import type { IRoomModel } from "../models/room.model.ts";
import type { AudioProviderConfig } from "./audio-provider.port.ts";

export type ClientSender = (message: Record<string, unknown>) => void;

export abstract class RealtimeGatewayPort {
  abstract openRoomChannel(
    room: IRoomModel,
    config: AudioProviderConfig,
  ): void | Promise<void>;
  abstract forwardAudioToProvider(roomId: string, base64Audio: string): void;
  abstract sendTextToProvider(roomId: string, text: string): void;
  abstract closeRoomChannel(roomId: string): void;
  abstract registerClientSender(roomId: string, sender: ClientSender): void;
  abstract unregisterClientSender(roomId: string): void;
}
