import type { RoomModel } from "../models/room.model";

export abstract class RoomRepositoryPort {
  abstract createRoom(
    companyId: string,
    token: string,
    expiresAt?: Date,
  ): Promise<RoomModel>;
  abstract updateRoomCallId(
    roomId: string,
    callId: string,
  ): Promise<RoomModel | null>;
  abstract findExpiredRooms(): Promise<RoomModel[]>;
}
