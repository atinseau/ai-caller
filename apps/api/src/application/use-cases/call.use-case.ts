import { inject, injectable } from "inversify";
import type { ICallModel } from "@/domain/models/call.model";
import { CallRepositoryPort } from "@/domain/repositories/call-repository.port";

@injectable()
export class CallUseCase {
  constructor(
    @inject(CallRepositoryPort)
    private readonly callRepository: CallRepositoryPort,
  ) {}

  async listByCompany(companyId: string): Promise<ICallModel[]> {
    return this.callRepository.findByCompanyId(companyId);
  }

  async getById(callId: string, companyId?: string): Promise<ICallModel> {
    const call = await this.callRepository.findById(callId);

    if (!call) {
      throw new Error("Call not found");
    }

    if (companyId && call.companyId !== companyId) {
      throw new Error("Call does not belong to the company");
    }

    return call;
  }
}
