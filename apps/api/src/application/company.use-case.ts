import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import type { ICreateCompanyDto } from "@/interfaces/dtos/create-company.dto";
import { inject, injectable } from "inversify";

@injectable()
export class CompanyUseCase {
  constructor(
    @inject(CompanyRepositoryPort) private companyRepository: CompanyRepositoryPort
  ) { }

  async create(dto: ICreateCompanyDto) {
    return this.companyRepository.createCompany(dto.name, dto.mcpServerUrl);
  }

  async list() {
    return this.companyRepository.getAllCompanies()
  }
}
