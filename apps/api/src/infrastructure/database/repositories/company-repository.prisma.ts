import type { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import { injectable } from "inversify";
import { prisma } from "../prisma";
import { CompanyMapper } from "../mappers/company.mapper";
import type { CompanyModel } from "@/domain/models/company.model";

@injectable()
export class CompanyRepositoryPrisma implements CompanyRepositoryPort {
  async createCompany(name: string, mcpServerUrl: string) {
    const company = await prisma.company.create({
      data: CompanyMapper.toEntity({
        mcpServerUrl,
        name
      })
    })
    return CompanyMapper.toModel(company)
  }

  async findById(id: string) {
    const company = await prisma.company.findUnique({
      where: {
        id
      }
    })
    if (!company) return null
    return CompanyMapper.toModel(company)
  }
}
