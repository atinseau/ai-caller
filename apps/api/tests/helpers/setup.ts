import type { Container } from "inversify";
import type { ICompanyModel } from "@/domain/models/company.model";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import { MockMcpServer } from "./mock-mcp-server";

export const mockMcpServer = new MockMcpServer();

export async function setupTestEnvironment() {
  await mockMcpServer.start();
  return { mcpUrl: mockMcpServer.url };
}

export function teardownTestEnvironment() {
  mockMcpServer.stop();
}

/**
 * Creates a test company inside the current transaction.
 * Uses the mock MCP server URL.
 */
export async function createTestCompany(
  container: Container,
  mcpUrl: string,
): Promise<ICompanyModel> {
  const companyRepo = container.get(CompanyRepositoryPort);
  return companyRepo.createCompany({
    name: `test-company-${Date.now()}`,
    mcpUrl,
  });
}
