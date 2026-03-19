import type { Schema } from "@ai-caller/shared";
import type { IRoomModel } from "../models/room.model.ts";

export abstract class RealtimeSessionPort {
  abstract initSession(
    roomId: string,
    companyMcpUrl?: string,
    sendToRoom?: (event: Schema["RealtimeClientEvent"]) => void,
  ): void;
  abstract destroySession(roomId: string): void;
  abstract processMessage(
    message: Schema["RealtimeServerEvent"],
    room: IRoomModel,
  ): Promise<Schema["RealtimeClientEvent"][]>;
}
