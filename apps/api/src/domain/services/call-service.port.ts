import type { ICompanyModel } from "../models/company.model.ts";
import type { IRoomModel } from "../models/room.model.ts";

export abstract class CallServicePort {
  /**
   * Create a new call for the given company
   *
   * @param company the company for where the call will start
   * @returns the call ID (token)
   */
  abstract createCall(
    company: ICompanyModel,
    modality: "AUDIO" | "TEXT",
  ): Promise<{
    token: string;
    expiresAt: Date;
  }>;

  abstract terminateCall(room: IRoomModel): Promise<void>;
}
