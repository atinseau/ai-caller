import { randomUUIDv7 } from "bun";
import type { ICompanyModel } from "@/domain/models/company.model";
import type { Company } from "@/generated/prisma/client";

export abstract class CompanyMapper {
  static toModel(prismaCompany: Company): ICompanyModel {
    return {
      promptId: prismaCompany.promptId,
      createdAt: prismaCompany.createdAt,
      id: prismaCompany.id,
      mcpUrl: prismaCompany.mcpUrl,
      mcpTestUrl: prismaCompany.mcpTestUrl,
      name: prismaCompany.name,
      updatedAt: prismaCompany.updatedAt,
    };
  }

  static toEntity(
    modelCompany: Omit<
      ICompanyModel,
      "id" | "createdAt" | "updatedAt" | "mcpTestUrl"
    > & { mcpTestUrl?: string },
  ): Company {
    return {
      id: randomUUIDv7(),
      createdAt: new Date(),
      updatedAt: new Date(),
      promptId: modelCompany.promptId,
      mcpTestUrl: modelCompany.mcpTestUrl || modelCompany.mcpUrl,
      mcpUrl: modelCompany.mcpUrl,
      name: modelCompany.name,
    };
  }
}
