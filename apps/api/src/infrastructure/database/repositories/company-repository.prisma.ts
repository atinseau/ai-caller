import { inject, injectable } from "inversify";
import type { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import type { PrismaClient } from "@/generated/prisma/client";
import { CompanyMapper } from "../mappers/company.mapper";
import { PRISMA_TOKEN } from "../prisma";

@injectable()
export class CompanyRepositoryPrisma implements CompanyRepositoryPort {
  constructor(@inject(PRISMA_TOKEN) private readonly prisma: PrismaClient) {}

  async createCompany(
    companyEntity: Parameters<(typeof CompanyMapper)["toEntity"]>[0],
  ) {
    const company = await this.prisma.company.create({
      data: CompanyMapper.toEntity(companyEntity),
    });
    return CompanyMapper.toModel(company);
  }

  async findById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });
    if (!company) return null;
    return CompanyMapper.toModel(company);
  }

  async getAllCompanies() {
    const companies = await this.prisma.company.findMany();
    return companies.map(CompanyMapper.toModel);
  }

  async deleteCompany(id: string) {
    await this.prisma.company.delete({ where: { id } });
  }
}
