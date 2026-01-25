import { injectable } from "inversify";
import type {
  CompanyUserModel,
  CompanyUserRepositoryPort,
} from "@/domain/repositories/company-user-repository.port";
import type { CompanyUserRole } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/database/prisma";

@injectable()
export class CompanyUserRepositoryPrisma implements CompanyUserRepositoryPort {
  async createCompanyUser(
    companyId: string,
    userId: string,
    role?: CompanyUserRole,
  ): Promise<CompanyUserModel> {
    const companyUser = await prisma.companyUser.create({
      data: {
        companyId,
        userId,
        role,
      },
    });

    return this.toModel(companyUser);
  }

  async findByUserId(userId: string): Promise<CompanyUserModel[]> {
    const companyUsers = await prisma.companyUser.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return companyUsers.map(this.toModel);
  }

  async findRootByCompanyId(
    companyId: string,
  ): Promise<CompanyUserModel | null> {
    const companyUser = await prisma.companyUser.findFirst({
      where: { companyId, role: "ROOT" },
    });

    if (!companyUser) return null;
    return this.toModel(companyUser);
  }

  async findByCompanyId(companyId: string): Promise<CompanyUserModel[]> {
    const companyUsers = await prisma.companyUser.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    return companyUsers.map(this.toModel);
  }

  async deleteCompanyUser(companyId: string, userId: string): Promise<void> {
    await prisma.companyUser.delete({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
    });
  }

  private toModel = (companyUser: {
    id: string;
    userId: string;
    companyId: string;
    role: CompanyUserRole;
    createdAt: Date;
    updatedAt: Date;
  }): CompanyUserModel => ({
    id: companyUser.id,
    userId: companyUser.userId,
    companyId: companyUser.companyId,
    role: companyUser.role,
    createdAt: companyUser.createdAt,
    updatedAt: companyUser.updatedAt,
  });
}
