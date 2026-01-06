import { randomUUIDv7 } from "bun";
import dayjs from "dayjs";
import type { IRoomModel } from "@/domain/models/room.model";
import type { Room } from "@/generated/prisma/client";

export abstract class RoomMapper {
  static toModel(prismaRoom: Room): IRoomModel {
    return {
      companyId: prismaRoom.companyId,
      id: prismaRoom.id,
      callId: prismaRoom.callId,
      expiresAt: prismaRoom.expiresAt,
      updatedAt: prismaRoom.updatedAt,
      createdAt: prismaRoom.createdAt,
      token: prismaRoom.token,
    };
  }

  static toEntity(
    modelRoom: Omit<
      IRoomModel,
      "id" | "createdAt" | "updatedAt" | "expiresAt"
    > & {
      expiresAt?: Date;
    },
  ): Room {
    const maxDurationMinutes = parseInt(
      Bun.env.MAX_ROOM_CALL_DURATION_MINUTE,
      10,
    );
    const now = dayjs();
    const maxAllowedExpiry = now.add(maxDurationMinutes, "minute");

    const expiresAt = !modelRoom.expiresAt
      ? maxAllowedExpiry.toDate()
      : dayjs(modelRoom.expiresAt).isBefore(maxAllowedExpiry)
        ? modelRoom.expiresAt
        : maxAllowedExpiry.toDate();

    return {
      id: randomUUIDv7(),
      companyId: modelRoom.companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt,
      callId: modelRoom.callId || null,
      token: modelRoom.token,
    };
  }
}
