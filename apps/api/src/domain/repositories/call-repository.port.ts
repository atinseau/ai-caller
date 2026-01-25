import type { ICallModel } from "@/domain/models/call.model";

export abstract class CallRepositoryPort {
  abstract createCall(
    companyId: string,
    payload?: {
      roomId?: string | null;
      status?: ICallModel["status"];
      provider?: ICallModel["provider"];
      startedAt?: Date | null;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<ICallModel>;

  abstract updateCall(
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
  ): Promise<ICallModel>;

  abstract findById(callId: string): Promise<ICallModel | null>;

  abstract findByRoomId(roomId: string): Promise<ICallModel | null>;

  abstract findByExternalCallId(
    externalCallId: string,
  ): Promise<ICallModel | null>;

  abstract findByCompanyId(companyId: string): Promise<ICallModel[]>;
}
