import { randomUUIDv7 } from "bun";
import type { ICallModel } from "@/domain/models/call.model";
import type { Call } from "@/generated/prisma/client";

export abstract class CallMapper {
  static toModel(prismaCall: Call): ICallModel {
    return {
      id: prismaCall.id,
      companyId: prismaCall.companyId,
      roomId: prismaCall.roomId,
      externalCallId: prismaCall.externalCallId ?? undefined,
      status: prismaCall.status,
      provider: prismaCall.provider,
      startedAt: prismaCall.startedAt ?? undefined,
      endedAt: prismaCall.endedAt ?? undefined,
      durationSeconds: prismaCall.durationSeconds ?? undefined,
      transcript: prismaCall.transcript ?? undefined,
      metadata: prismaCall.metadata ?? undefined,
      costCents: prismaCall.costCents ?? undefined,
      createdAt: prismaCall.createdAt,
      updatedAt: prismaCall.updatedAt,
    };
  }

  static toEntity(
    modelCall: Omit<
      ICallModel,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "durationSeconds"
      | "endedAt"
      | "startedAt"
    > & {
      startedAt?: Date | null;
      endedAt?: Date | null;
      durationSeconds?: number | null;
    },
  ): Call {
    return {
      id: randomUUIDv7(),
      companyId: modelCall.companyId,
      roomId: modelCall.roomId ?? null,
      externalCallId: modelCall.externalCallId ?? null,
      status: modelCall.status,
      provider: modelCall.provider,
      startedAt: modelCall.startedAt ?? null,
      endedAt: modelCall.endedAt ?? null,
      durationSeconds: modelCall.durationSeconds ?? null,
      transcript: modelCall.transcript ?? null,
      metadata: modelCall.metadata ?? null,
      costCents: modelCall.costCents ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
