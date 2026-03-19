import { inject, injectable } from "inversify";
import type {
  IRoomEvent,
  RoomEventPayload,
  RoomEventRepositoryPort,
  RoomEventType,
} from "@/domain/repositories/room-event-repository.port.ts";
import type { PrismaClient } from "@/generated/prisma/client";
import { PRISMA_TOKEN } from "../prisma.ts";

@injectable()
export class RoomEventRepositoryPrisma implements RoomEventRepositoryPort {
  constructor(@inject(PRISMA_TOKEN) private readonly prisma: PrismaClient) {}

  async create(
    roomId: string,
    type: RoomEventType,
    payload: RoomEventPayload,
  ): Promise<IRoomEvent> {
    const event = await this.prisma.roomEvent.create({
      // biome-ignore lint/suspicious/noExplicitAny: Prisma JsonValue mismatch
      data: { roomId, type, payload: payload as any },
    });
    return {
      id: event.id,
      createdAt: event.createdAt,
      roomId: event.roomId,
      type: event.type as RoomEventType,
      payload: event.payload as RoomEventPayload,
    };
  }

  async findByRoomId(roomId: string): Promise<IRoomEvent[]> {
    const events = await this.prisma.roomEvent.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
    });
    return events.map((e) => ({
      id: e.id,
      createdAt: e.createdAt,
      roomId: e.roomId,
      type: e.type as RoomEventType,
      payload: e.payload as RoomEventPayload,
    }));
  }
}
