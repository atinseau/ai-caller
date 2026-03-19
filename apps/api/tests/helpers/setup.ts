import type { Container } from "inversify";
import type { ICompanyModel } from "@/domain/models/company.model.ts";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port.ts";
import { MockMcpServer } from "./mock-mcp-server.ts";

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
export function createTestCompany(
  container: Container,
  _mcpUrl: string,
): Promise<ICompanyModel> {
  const companyRepo = container.get(CompanyRepositoryPort);
  return companyRepo.createCompany({
    name: `test-company-${Date.now()}`,
    description: null,
  });
}
