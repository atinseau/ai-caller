import type { Schema } from "@ai-caller/shared";
import type { IRoomModel } from "../models/room.model";

export abstract class RealtimeGatewayPort {
  abstract openRoomChannel(
    room: IRoomModel,
    companyMcpUrl?: string,
  ): void | Promise<void>;
  abstract sendToRoom(
    roomId: string,
    event: Schema["RealtimeClientEvent"],
  ): void;
  abstract closeRoomChannel(roomId: string): void;
}
