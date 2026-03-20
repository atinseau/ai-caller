import { inject, injectable } from "inversify";
import type { ICompanyModel } from "@/domain/models/company.model.ts";
import type { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port.ts";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { CompanyMapper } from "../mappers/company.mapper.ts";
import { PRISMA_TOKEN } from "../prisma.ts";

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

  async updateCompany(
    id: string,
    data: Partial<
      Pick<
        ICompanyModel,
        | "name"
        | "mcpUrl"
        | "status"
        | "systemPromptSections"
        | "description"
        | "toolConfigs"
        | "systemToolPrompts"
        | "voice"
        | "language"
        | "vadEagerness"
      >
    >,
  ) {
    const prismaData: Prisma.CompanyUpdateInput = {
      ...data,
      systemPromptSections:
        data.systemPromptSections === undefined
          ? undefined
          : data.systemPromptSections === null
            ? Prisma.DbNull
            : (data.systemPromptSections as Prisma.InputJsonValue),
      toolConfigs:
        data.toolConfigs === undefined
          ? undefined
          : data.toolConfigs === null
            ? Prisma.DbNull
            : (data.toolConfigs as Prisma.InputJsonValue),
      systemToolPrompts:
        data.systemToolPrompts === undefined
          ? undefined
          : data.systemToolPrompts === null
            ? Prisma.DbNull
            : (data.systemToolPrompts as Prisma.InputJsonValue),
    };

    const company = await this.prisma.company.update({
      where: { id },
      data: prismaData,
    });
    return CompanyMapper.toModel(company);
  }

  async deleteCompany(id: string) {
    await this.prisma.company.delete({ where: { id } });
  }
}
