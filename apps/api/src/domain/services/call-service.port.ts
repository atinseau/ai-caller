import type { ICompanyModel } from "../models/company.model.ts";
import type { IRoomModel } from "../models/room.model.ts";

export abstract class CallServicePort {
  /**
   * Create a new call for the given company (WebRTC path — returns ephemeral token)
   */
  abstract createCall(
    company: ICompanyModel,
    modality: "AUDIO" | "TEXT",
  ): Promise<{
    token: string;
    expiresAt: Date;
  }>;

  /**
   * Build the OpenAI Realtime session config without creating a client secret.
   * Used by the telephony path which authenticates with the API key directly.
   */
  abstract buildSessionConfig(
    company: ICompanyModel,
    modality: "AUDIO" | "TEXT",
  ): Promise<Record<string, unknown>>;

  abstract terminateCall(room: IRoomModel): Promise<void>;
}
