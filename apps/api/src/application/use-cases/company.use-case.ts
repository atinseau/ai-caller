import { inject, injectable } from "inversify";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port.ts";
import type { ICreateCompanyRequestDto } from "@/interfaces/dtos/company/create-company-request.dto.ts";

@injectable()
export class CompanyUseCase {
  constructor(
    @inject(CompanyRepositoryPort)
    private companyRepository: CompanyRepositoryPort,
  ) {}

  create(dto: ICreateCompanyRequestDto) {
    return this.companyRepository.createCompany({
      name: dto.name,
      mcpUrl: dto.mcpUrl,
    });
  }

  list() {
    return this.companyRepository.getAllCompanies();
  }

  getById(id: string) {
    return this.companyRepository.findById(id);
  }

  delete(id: string) {
    return this.companyRepository.deleteCompany(id);
  }
}
