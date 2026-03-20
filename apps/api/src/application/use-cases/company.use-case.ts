import { HTTPException } from "hono/http-exception";
import { inject, injectable } from "inversify";
import { CompanyStatus } from "@/domain/enums/company-status.enum.ts";
import { McpStatus } from "@/domain/enums/mcp-status.enum.ts";
import type { ICompanyModel } from "@/domain/models/company.model.ts";
import {
  McpClientPort,
  type McpToolDefinition,
} from "@/domain/ports/mcp-client.port.ts";
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

  async listTools(
    mcpUrl: string | null,
    mcpStatus: McpStatus,
  ): Promise<McpToolDefinition[]> {
    if (mcpStatus !== McpStatus.CONNECTED || !mcpUrl) return [];

    try {
      await this.mcpClient.connect(mcpUrl);
      const tools = await this.mcpClient.listTools();
      await this.mcpClient.disconnect();
      return tools;
    } catch {
      return [];
    }
  }

  async update(id: string, dto: IUpdateCompanyRequestDto) {
    const company = await this.companyRepository.findById(id);
    if (!company) {
      throw new HTTPException(404, { message: "Company not found" });
    }

    const isActivating =
      dto.status === CompanyStatus.ACTIVE &&
      company.status !== CompanyStatus.ACTIVE;

    if (isActivating) {
      await this.validateActivation(company, dto);
    }

    const isClearingPrompt =
      dto.systemPrompt !== undefined &&
      (!dto.systemPrompt || dto.systemPrompt.trim() === "");

    if (
      isClearingPrompt &&
      company.status === CompanyStatus.ACTIVE &&
      !isActivating
    ) {
      throw new HTTPException(400, {
        message:
          "Cannot clear the system prompt while the company is active. Deactivate the company first.",
      });
    }

    return this.companyRepository.updateCompany(id, dto);
  }

  delete(id: string) {
    return this.companyRepository.deleteCompany(id);
  }

  private async validateActivation(
    company: ICompanyModel,
    dto: IUpdateCompanyRequestDto,
  ): Promise<void> {
    const effectivePrompt =
      dto.systemPrompt !== undefined ? dto.systemPrompt : company.systemPrompt;
    if (!effectivePrompt || effectivePrompt.trim() === "") {
      throw new HTTPException(400, {
        message:
          "Cannot activate: the system prompt is required. Configure a system prompt before activating.",
      });
    }

    const effectiveMcpUrl =
      dto.mcpUrl !== undefined ? dto.mcpUrl : company.mcpUrl;
    if (!effectiveMcpUrl) {
      throw new HTTPException(400, {
        message:
          "Cannot activate: the MCP server URL is not configured. Set an MCP URL before activating.",
      });
    }

    const reachable = await this.mcpClient.checkConnectivity(effectiveMcpUrl);
    if (!reachable) {
      throw new HTTPException(400, {
        message:
          "Cannot activate: the MCP server is unreachable. Verify the URL and server status.",
      });
    }

    await this.mcpClient.connect(effectiveMcpUrl);
    const tools = await this.mcpClient.listTools();
    await this.mcpClient.disconnect();

    if (tools.length === 0) {
      throw new HTTPException(400, {
        message:
          "Cannot activate: no tools found on the MCP server. At least one tool is required.",
      });
    }
  }
}
