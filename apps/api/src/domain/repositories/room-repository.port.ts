import type { RoomSource } from "../enums/room-source.enum.ts";
import type { IRoomModel } from "../models/room.model.ts";

export abstract class RoomRepositoryPort {
  abstract createRoom(
    companyId: string,
    token: string,
    expiresAt?: Date,
    modality?: "AUDIO" | "TEXT",
    isTest?: boolean,
    source?: RoomSource,
  ): Promise<IRoomModel>;
  abstract updateRoomCallId(
    roomId: string,
    callId: string,
  ): Promise<IRoomModel | null>;
  abstract updateTwilioStreamSid(
    roomId: string,
    streamSid: string,
  ): Promise<IRoomModel>;
  abstract findExpiredRooms(): Promise<IRoomModel[]>;

  abstract findById(roomId: string): Promise<IRoomModel>;

  abstract updateContactId(
    roomId: string,
    contactId: string,
  ): Promise<IRoomModel>;

  abstract deleteRoom(roomId: string): Promise<void>;
}
