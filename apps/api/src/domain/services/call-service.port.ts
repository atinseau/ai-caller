import type { ICompanyModel } from "../models/company.model.ts";
import type { IRoomModel } from "../models/room.model.ts";
import type { AudioProviderConfig } from "../ports/audio-provider.port.ts";

export abstract class CallServicePort {
  /**
   * Create a new call for the given company (WebRTC path — returns ephemeral token)
   */
  abstract createCall(
    company: ICompanyModel,
    modality: "AUDIO" | "TEXT",
    contactSummary?: string,
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
    contactSummary?: string,
  ): Promise<Record<string, unknown>>;

  /**
   * Build a normalized AudioProviderConfig for the unified audio gateway.
   */
  abstract buildAudioProviderConfig(
    company: ICompanyModel,
    contactSummary?: string,
  ): Promise<AudioProviderConfig>;

  abstract terminateCall(room: IRoomModel): Promise<void>;
}
