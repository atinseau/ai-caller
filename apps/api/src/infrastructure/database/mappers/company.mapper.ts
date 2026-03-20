import { randomUUIDv7 } from "bun";
import { CompanyStatus } from "@/domain/enums/company-status.enum.ts";
import type {
  ICompanyModel,
  ISystemToolPrompts,
  IToolConfigs,
} from "@/domain/models/company.model.ts";
import { type Company, Prisma } from "@/generated/prisma/client";

export abstract class CompanyMapper {
  static toModel(prismaCompany: Company): ICompanyModel {
    return {
      mcpUrl: prismaCompany.mcpUrl,
      createdAt: prismaCompany.createdAt,
      id: prismaCompany.id,
      name: prismaCompany.name,
      updatedAt: prismaCompany.updatedAt,
      status: prismaCompany.status as CompanyStatus,
      systemPrompt: prismaCompany.systemPrompt,
      description: prismaCompany.description,
      toolConfigs: (prismaCompany.toolConfigs as IToolConfigs) ?? null,
      systemToolPrompts:
        (prismaCompany.systemToolPrompts as ISystemToolPrompts) ?? null,
      voice: prismaCompany.voice,
      language: prismaCompany.language,
      vadEagerness: prismaCompany.vadEagerness,
    };
  }

  static toEntity(
    modelCompany: Pick<ICompanyModel, "name" | "description">,
  ): Prisma.CompanyCreateInput {
    return {
      id: randomUUIDv7(),
      name: modelCompany.name,
      status: CompanyStatus.INACTIVE,
      description: modelCompany.description ?? null,
      toolConfigs: Prisma.DbNull,
      systemToolPrompts: Prisma.DbNull,
      voice: null,
      language: null,
      vadEagerness: null,
    };
  }
}
