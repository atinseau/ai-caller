import { inject, injectable } from "inversify";
import { McpStatus } from "@/domain/enums/mcp-status.enum.ts";
import { McpClientPort } from "@/domain/ports/mcp-client.port.ts";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port.ts";
import type { ICreateCompanyRequestDto } from "@/interfaces/dtos/company/create-company-request.dto.ts";
import type { IUpdateCompanyRequestDto } from "@/interfaces/dtos/company/update-company-request.dto.ts";

@injectable()
export class CompanyUseCase {
  constructor(
    @inject(CompanyRepositoryPort)
    private companyRepository: CompanyRepositoryPort,
    @inject(McpClientPort)
    private mcpClient: McpClientPort,
  ) {}

  create(dto: ICreateCompanyRequestDto) {
    return this.companyRepository.createCompany({
      name: dto.name,
      description: dto.description ?? null,
    });
  }

  list() {
    return this.companyRepository.getAllCompanies();
  }

  getById(id: string) {
    return this.companyRepository.findById(id);
  }

  async checkMcpStatus(mcpUrl: string | null): Promise<McpStatus> {
    if (!mcpUrl) return McpStatus.NOT_CONFIGURED;

    const reachable = await this.mcpClient.checkConnectivity(mcpUrl);
    return reachable ? McpStatus.CONNECTED : McpStatus.UNREACHABLE;
  }

  update(id: string, dto: IUpdateCompanyRequestDto) {
    return this.companyRepository.updateCompany(id, dto);
  }

  delete(id: string) {
    return this.companyRepository.deleteCompany(id);
  }
}
