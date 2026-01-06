import { inject, injectable } from "inversify";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import type { ICreateCompanyDto } from "@/interfaces/dtos/create-company.dto";

@injectable()
export class CompanyUseCase {
  constructor(
    @inject(CompanyRepositoryPort) private companyRepository: CompanyRepositoryPort
  ) { }

  async create(dto: ICreateCompanyDto) {
    return this.companyRepository.createCompany({
      name: dto.name,
      mcpUrl: dto.mcpUrl,
      mcpTestUrl: dto.mcpTestUrl,
      promptId: dto.promptId
    });
  }

  async list() {
    return this.companyRepository.getAllCompanies()
  }
}
