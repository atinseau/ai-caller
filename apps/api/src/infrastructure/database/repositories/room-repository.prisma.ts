import { injectable } from "inversify";
import type { IRoomModel } from "@/domain/models/room.model";
import type { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import { RoomMapper } from "../mappers/room.mapper";
import { prisma } from "../prisma";

@injectable()
export class RoomRepositoryPrisma implements RoomRepositoryPort {
  async createRoom(companyId: string, token: string, expiresAt?: Date) {
    const room = await prisma.room.create({
      data: RoomMapper.toEntity({
        token,
        companyId,
        expiresAt,
      }),
    });
    return RoomMapper.toModel(room);
  }

  async updateRoomCallId(
    roomId: string,
    callId: string,
  ): Promise<IRoomModel | null> {
    const room = await prisma.room.update({
      where: {
        id: roomId,
      },
      data: {
        callId,
      },
    });
    return RoomMapper.toModel(room);
  }

  async findExpiredRooms(): Promise<IRoomModel[]> {
    const rooms = await prisma.room.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return rooms.map(RoomMapper.toModel);
  }

  async findById(roomId: string): Promise<IRoomModel> {
    const room = await prisma.room.findUniqueOrThrow({
      where: {
        id: roomId,
      },
    });
    return RoomMapper.toModel(room);
  }
}
