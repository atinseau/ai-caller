import type { IRoomModel } from "../models/room.model";

export abstract class RoomRepositoryPort {
  abstract createRoom(
    companyId: string,
    token: string,
    expiresAt?: Date,
  ): Promise<IRoomModel>;
  abstract updateRoomCallId(
    roomId: string,
    callId: string,
  ): Promise<IRoomModel | null>;
  abstract findExpiredRooms(): Promise<IRoomModel[]>;

  abstract findById(roomId: string): Promise<IRoomModel>;
}
