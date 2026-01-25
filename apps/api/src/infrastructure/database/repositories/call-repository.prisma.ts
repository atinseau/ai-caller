import { injectable } from "inversify";
import type { ICallModel } from "@/domain/models/call.model";
import type { CallRepositoryPort } from "@/domain/repositories/call-repository.port";
import { CallProvider, CallStatus } from "@/generated/prisma/enums";
import { CallMapper } from "@/infrastructure/database/mappers/call.mapper";
import { prisma } from "@/infrastructure/database/prisma";

@injectable()
export class CallRepositoryPrisma implements CallRepositoryPort {
  async createCall(
    companyId: string,
    payload?: {
      roomId?: string | null;
      status?: ICallModel["status"];
      provider?: ICallModel["provider"];
      startedAt?: Date | null;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<ICallModel> {
    const call = await prisma.call.create({
      data: CallMapper.toEntity({
        companyId,
        roomId: payload?.roomId ?? null,
        status: payload?.status ?? CallStatus.CREATED,
        provider: payload?.provider ?? CallProvider.DEV,
        startedAt: payload?.startedAt ?? null,
        endedAt: null,
        durationSeconds: null,
        transcript: null,
        metadata: payload?.metadata ?? null,
        costCents: null,
      }),
    });

    return CallMapper.toModel(call);
  }

  async updateCall(
    callId: string,
    payload: Partial<
      Pick<
        ICallModel,
        | "roomId"
        | "externalCallId"
        | "status"
        | "startedAt"
        | "endedAt"
        | "durationSeconds"
        | "transcript"
        | "metadata"
        | "costCents"
      >
    >,
  ): Promise<ICallModel> {
    const call = await prisma.call.update({
      where: { id: callId },
      data: {
        roomId: payload.roomId ?? undefined,
        externalCallId: payload.externalCallId ?? undefined,
        status: payload.status ?? undefined,
        startedAt: payload.startedAt ?? undefined,
        endedAt: payload.endedAt ?? undefined,
        durationSeconds: payload.durationSeconds ?? undefined,
        transcript: payload.transcript ?? undefined,
        metadata: payload.metadata ?? undefined,
        costCents: payload.costCents ?? undefined,
      },
    });

    return CallMapper.toModel(call);
  }

  async findById(callId: string): Promise<ICallModel | null> {
    const call = await prisma.call.findUnique({
      where: { id: callId },
    });

    if (!call) return null;
    return CallMapper.toModel(call);
  }

  async findByRoomId(roomId: string): Promise<ICallModel | null> {
    const call = await prisma.call.findFirst({
      where: { roomId },
      orderBy: { createdAt: "desc" },
    });

    if (!call) return null;
    return CallMapper.toModel(call);
  }

  async findByExternalCallId(
    externalCallId: string,
  ): Promise<ICallModel | null> {
    const call = await prisma.call.findFirst({
      where: { externalCallId },
      orderBy: { createdAt: "desc" },
    });

    if (!call) return null;
    return CallMapper.toModel(call);
  }

  async findByCompanyId(companyId: string): Promise<ICallModel[]> {
    const calls = await prisma.call.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    return calls.map(CallMapper.toModel);
  }
}
