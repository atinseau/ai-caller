import { inject, injectable } from "inversify";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import type { ICreateCompanyRequestDto } from "@/interfaces/dtos/company/create-company-request.dto";

@injectable()
export class CompanyUseCase {
  constructor(
    @inject(CompanyRepositoryPort)
    private companyRepository: CompanyRepositoryPort,
  ) {}

  async create(dto: ICreateCompanyRequestDto) {
    return this.companyRepository.createCompany({
      name: dto.name,
      mcpUrl: dto.mcpUrl,
    });
  }

  async list() {
    return this.companyRepository.getAllCompanies();
  }

  async getById(id: string) {
    return this.companyRepository.findById(id);
  }

  async delete(id: string) {
    return this.companyRepository.deleteCompany(id);
  }
}
