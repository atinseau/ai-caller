import type { ICompanyModel } from "@/domain/models/company.model.ts";
import type { CompanyMapper } from "@/infrastructure/database/mappers/company.mapper.ts";

export abstract class CompanyRepositoryPort {
  /**
   * @param companyEntity The company entity to create
   */
  abstract createCompany(
    companyEntity: Parameters<(typeof CompanyMapper)["toEntity"]>[0],
  ): Promise<ICompanyModel>;

  /**
   * @param id The id of the company to find
   */
  abstract findById(id: string): Promise<ICompanyModel | null>;

  /**
   * Retrieve all companies
   */
  abstract getAllCompanies(): Promise<ICompanyModel[]>;

  /**
   * Update a company by id
   */
  abstract updateCompany(
    id: string,
    data: Partial<
      Pick<
        ICompanyModel,
        | "name"
        | "mcpUrl"
        | "status"
        | "systemPrompt"
        | "description"
        | "toolConfigs"
        | "systemToolPrompts"
        | "voice"
        | "language"
        | "vadEagerness"
      >
    >,
  ): Promise<ICompanyModel>;

  /**
   * Delete a company by id
   */
  abstract deleteCompany(id: string): Promise<void>;
}
