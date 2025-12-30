import type { CompanyModel } from "@/types";

export abstract class CallServicePort {
  /**
   * Create a new call for the given company
   *
   * @param company the company for where the call will start
   * @returns the call ID (token)
   */
  abstract createCall(company: CompanyModel): Promise<{
    token: string,
    expiresAt: Date
  }>

}
