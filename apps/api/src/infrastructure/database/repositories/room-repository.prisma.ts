import { inject, injectable } from "inversify";
import type { RoomSource } from "@/domain/enums/room-source.enum.ts";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import type { RoomRepositoryPort } from "@/domain/repositories/room-repository.port.ts";
import type { PrismaClient } from "@/generated/prisma/client";
import { RoomMapper } from "../mappers/room.mapper.ts";
import { PRISMA_TOKEN } from "../prisma.ts";

@injectable()
export class RoomRepositoryPrisma implements RoomRepositoryPort {
  constructor(@inject(PRISMA_TOKEN) private readonly prisma: PrismaClient) {}

  async createRoom(
    companyId: string,
    token: string,
    expiresAt?: Date,
    modality?: "AUDIO" | "TEXT",
    isTest?: boolean,
    source?: RoomSource,
  ) {
    const room = await this.prisma.room.create({
      data: RoomMapper.toEntity({
        token,
        companyId,
        expiresAt,
        modality,
        isTest,
        source,
      }),
    });
    return RoomMapper.toModel(room);
  }

  async updateRoomCallId(
    roomId: string,
    callId: string,
  ): Promise<IRoomModel | null> {
    const room = await this.prisma.room.update({
      where: { id: roomId },
      data: { callId },
    });
    return RoomMapper.toModel(room);
  }

  async updateTwilioStreamSid(
    roomId: string,
    streamSid: string,
  ): Promise<IRoomModel> {
    const room = await this.prisma.room.update({
      where: { id: roomId },
      data: { twilioStreamSid: streamSid },
    });
    return RoomMapper.toModel(room);
  }

  async findExpiredRooms(): Promise<IRoomModel[]> {
    const rooms = await this.prisma.room.findMany({
      where: {
        deletedAt: null,
        expiresAt: { lt: new Date() },
      },
    });
    return rooms.map(RoomMapper.toModel);
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.prisma.room.delete({
      where: { id: roomId },
    });
  }

  async findById(roomId: string): Promise<IRoomModel> {
    const room = await this.prisma.room.findUniqueOrThrow({
      where: { id: roomId },
    });
    return RoomMapper.toModel(room);
  }
}
