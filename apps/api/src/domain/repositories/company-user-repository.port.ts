import type { CompanyUserRole } from "@/generated/prisma/enums";

export type CompanyUserModel = {
  id: string;
  userId: string;
  companyId: string;
  role: CompanyUserRole;
  createdAt: Date;
  updatedAt: Date;
};

export abstract class CompanyUserRepositoryPort {
  abstract createCompanyUser(
    companyId: string,
    userId: string,
    role?: CompanyUserRole,
  ): Promise<CompanyUserModel>;

  abstract findByUserId(userId: string): Promise<CompanyUserModel[]>;

  abstract findRootByCompanyId(
    companyId: string,
  ): Promise<CompanyUserModel | null>;

  abstract findByCompanyId(companyId: string): Promise<CompanyUserModel[]>;

  abstract deleteCompanyUser(companyId: string, userId: string): Promise<void>;
}
