import type { IRoomModel } from "../models/room.model.ts";
import type {
  AudioProviderConnection,
  NormalizedAudioEvent,
} from "./audio-provider.port.ts";

export abstract class RealtimeSessionPort {
  abstract initSession(
    roomId: string,
    companyMcpUrl?: string,
    connection?: AudioProviderConnection,
    isTest?: boolean,
    onSessionEnd?: () => void,
    getAudioDrainMs?: () => number,
  ): void;
  abstract destroySession(roomId: string): void;
  abstract processEvent(
    event: NormalizedAudioEvent,
    room: IRoomModel,
  ): Promise<void>;
}
