import { randomUUIDv7 } from "bun";
import type { CompanyModel } from "@/domain/models/company.model";
import type { Company } from "@/prisma/client";

export abstract class CompanyMapper {
  static toModel(prismaCompany: Company): CompanyModel {
    return {
      createdAt: prismaCompany.createdAt,
      id: prismaCompany.id,
      mcpServerUrl: prismaCompany.mcpServerUrl,
      name: prismaCompany.name,
      updatedAt: prismaCompany.updatedAt
    }
  }

  static toEntity(modelCompany: Pick<CompanyModel, 'mcpServerUrl' | 'name'>): Company {
    return {
      id: randomUUIDv7(),
      createdAt: new Date(),
      updatedAt: new Date(),
      mcpServerUrl: modelCompany.mcpServerUrl,
      name: modelCompany.name,
    }
  }
}
