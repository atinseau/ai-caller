import { inject, injectable } from "inversify";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import { CompanyUserRepositoryPort } from "@/domain/repositories/company-user-repository.port";
import { CompanyUserRole } from "@/generated/prisma/enums";
import type { ICreateCompanyRequestDto } from "@/interfaces/dtos/company/create-company-request.dto";

@injectable()
export class CompanyUseCase {
  constructor(
    @inject(CompanyRepositoryPort)
    private companyRepository: CompanyRepositoryPort,
    @inject(CompanyUserRepositoryPort)
    private companyUserRepository: CompanyUserRepositoryPort,
  ) {}

  async create(dto: ICreateCompanyRequestDto) {
    return this.companyRepository.createCompany({
      name: dto.name,
      mcpUrl: dto.mcpUrl,
    });
  }

  async createWithOwner(dto: ICreateCompanyRequestDto, ownerUserId: string) {
    const company = await this.companyRepository.createCompany({
      name: dto.name,
      mcpUrl: dto.mcpUrl,
    });

    await this.companyUserRepository.createCompanyUser(
      company.id,
      ownerUserId,
      CompanyUserRole.ROOT,
    );

    return company;
  }

  async list() {
    return this.companyRepository.getAllCompanies();
  }

  async listByUser(userId: string) {
    const companyUsers = await this.companyUserRepository.findByUserId(userId);
    const companies = await Promise.all(
      companyUsers.map((companyUser) =>
        this.companyRepository.findById(companyUser.companyId),
      ),
    );

    return companies.filter((company): company is NonNullable<typeof company> =>
      Boolean(company),
    );
  }
}
