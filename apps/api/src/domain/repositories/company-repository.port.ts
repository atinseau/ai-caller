import { CompanyModel } from "@/domain/models/company.model"

export abstract class CompanyRepositoryPort {

  /**
   *
   * @param name Name of the company to create
   * @param mcpUrl MCP URL of the company to create
   * @param mcpTestUrl Optional MCP Test URL of the company to create
   */
  abstract createCompany(name: string, mcpUrl: string, mcpTestUrl?: string): Promise<CompanyModel>

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
