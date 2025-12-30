import { randomUUIDv7 } from "bun";
import type { CompanyModel } from "@/domain/models/company.model";
import type { Company } from "@/generated/prisma/client";


export abstract class CompanyMapper {
  static toModel(prismaCompany: Company): CompanyModel {
    return {
      createdAt: prismaCompany.createdAt,
      id: prismaCompany.id,
      mcpUrl: prismaCompany.mcpUrl,
      mcpTestUrl: prismaCompany.mcpTestUrl,
      name: prismaCompany.name,
      updatedAt: prismaCompany.updatedAt
    }
  }

  static toEntity(modelCompany: Omit<CompanyModel, 'id' | 'createdAt' | 'updatedAt'>): Company {
    return {
      id: randomUUIDv7(),
      createdAt: new Date(),
      updatedAt: new Date(),
      mcpTestUrl: modelCompany.mcpTestUrl,
      mcpUrl: modelCompany.mcpUrl,
      name: modelCompany.name,
    }
  }
}
