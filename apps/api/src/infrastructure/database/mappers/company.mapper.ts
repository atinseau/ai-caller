import { randomUUIDv7 } from "bun";
import { CompanyStatus } from "@/domain/enums/company-status.enum.ts";
import type { ICompanyModel } from "@/domain/models/company.model.ts";
import type { Company } from "@/generated/prisma/client";

export abstract class CompanyMapper {
  static toModel(prismaCompany: Company): ICompanyModel {
    return {
      mcpUrl: prismaCompany.mcpUrl,
      createdAt: prismaCompany.createdAt,
      id: prismaCompany.id,
      name: prismaCompany.name,
      updatedAt: prismaCompany.updatedAt,
      status: prismaCompany.status as CompanyStatus,
    };
  }

  static toEntity(
    modelCompany: Omit<
      ICompanyModel,
      "id" | "createdAt" | "updatedAt" | "status"
    >,
  ): Company {
    return {
      id: randomUUIDv7(),
      createdAt: new Date(),
      updatedAt: new Date(),
      mcpUrl: modelCompany.mcpUrl,
      name: modelCompany.name,
      status: CompanyStatus.INACTIVE,
    };
  }
}
