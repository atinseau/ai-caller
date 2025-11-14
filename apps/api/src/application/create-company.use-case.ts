import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import type { ICreateCompanyDto } from "@/interfaces/dtos/create-company.dto";
import { inject, injectable } from "inversify";

@injectable()
export class CreateCompanyUseCase {
  constructor(
    @inject(CompanyRepositoryPort) private companyRepository: CompanyRepositoryPort
  ) {}

  async execute(dto: ICreateCompanyDto) {
    return this.companyRepository.createCompany(dto.name, dto.mcpServerUrl);
  }
}
