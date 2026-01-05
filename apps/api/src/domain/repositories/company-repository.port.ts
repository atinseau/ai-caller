import type { CompanyModel } from "@/domain/models/company.model"
import type { CompanyMapper } from "@/infrastructure/database/mappers/company.mapper";

export abstract class CompanyRepositoryPort {

  /**
   *
   * @param companyEntity The company entity to create
   */
  abstract createCompany(companyEntity: Parameters<typeof CompanyMapper['toEntity']>[0]): Promise<CompanyModel>

  /**
   *
   * @param id The id of the company to find
   */
  abstract findById(id: string): Promise<CompanyModel | null>

  /**
   * Retrieve all companies
   */
  abstract getAllCompanies(): Promise<CompanyModel[]>
}
