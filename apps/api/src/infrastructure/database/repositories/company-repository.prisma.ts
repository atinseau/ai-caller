import { injectable } from "inversify";
import type { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import { CompanyMapper } from "../mappers/company.mapper";
import { prisma } from "../prisma";

@injectable()
export class CompanyRepositoryPrisma implements CompanyRepositoryPort {
  async createCompany(
    companyEntity: Parameters<(typeof CompanyMapper)["toEntity"]>[0],
  ) {
    const company = await prisma.company.create({
      data: CompanyMapper.toEntity(companyEntity),
    });
    return CompanyMapper.toModel(company);
  }

  async findById(id: string) {
    const company = await prisma.company.findUnique({
      where: {
        id,
      },
    });
    if (!company) return null;
    return CompanyMapper.toModel(company);
  }

  async getAllCompanies() {
    const companies = await prisma.company.findMany();
    return companies.map(CompanyMapper.toModel);
  }
}
