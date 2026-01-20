import { randomUUIDv7 } from "bun";
import dayjs from "dayjs";
import type { IRoomModel } from "@/domain/models/room.model";
import type { Room } from "@/generated/prisma/client";
import { env } from "@/infrastructure/config/env";

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
    const now = dayjs();

    // Default
    const defaultExpiresAt = now.add(
      env.get("ROOM_CALL_DURATION_MINUTE"),
      "minute",
    );

    const expiresAt = !modelRoom.expiresAt
      ? defaultExpiresAt.toDate()
      : modelRoom.expiresAt;

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
