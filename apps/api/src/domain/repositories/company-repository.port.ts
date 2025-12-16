import { CompanyModel } from "@/domain/models/company.model"

export abstract class CompanyRepositoryPort {

  /**
   *
   * @param name Name of the company to create
   * @param mcpServerUrl MCP server URL associated with the company
   */
  abstract createCompany(name: string, mcpServerUrl: string): Promise<CompanyModel>

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
