import { describe, expect, it, mock } from "bun:test";
import { N8nService } from "../../src/application/services/n8n.service";
import { N8nSanitizeService } from "../../src/application/services/n8n-sanitize.service";
import type { N8nClient } from "../../src/domain/models/n8n.model";
import type { N8nClientPort } from "../../src/domain/ports/n8n-client.port";
import type { N8nWorkflowStoragePort } from "../../src/domain/ports/n8n-workflow-storage.port";
import type { SecretManagerPort } from "../../src/domain/ports/secret-manager.port";

function createMockClient(): N8nClient {
  return {
    getWorkflow: mock(() => Promise.resolve({} as any)),
    listWorkflows: mock(() => Promise.resolve([])),
    createWorkflow: mock(() => Promise.resolve({} as any)),
    updateWorkflow: mock(() => Promise.resolve({} as any)),
    deleteWorkflow: mock(() => Promise.resolve()),
    activateWorkflow: mock(() => Promise.resolve({} as any)),
    deactivateWorkflow: mock(() => Promise.resolve({} as any)),
  };
}

function createService(overrides: {
  clientPort?: Partial<N8nClientPort>;
  storagePort?: Partial<N8nWorkflowStoragePort>;
  secrets?: Partial<SecretManagerPort>;
}) {
  return new N8nService(
    overrides.clientPort as N8nClientPort,
    overrides.storagePort as N8nWorkflowStoragePort,
    overrides.secrets as SecretManagerPort,
    new N8nSanitizeService(),
  );
}

describe("N8nService", () => {
  describe("getClientForCompany", () => {
    it("creates a client using secret from Infisical", async () => {
      const mockClient = createMockClient();

      const service = createService({
        clientPort: { createClient: mock(() => mockClient) },
        secrets: { getSecret: mock(() => Promise.resolve("company-api-key")) },
      });

      const client = await service.getClientForCompany("acme");
      expect(client).toBe(mockClient);
    });
  });

  describe("listWorkflows", () => {
    it("lists workflows from root when no company specified", async () => {
      const mockClient = createMockClient();
      (mockClient.listWorkflows as any).mockImplementation(() =>
        Promise.resolve([{ id: "1", name: "WF1", active: true }]),
      );

      const service = createService({
        clientPort: { createClient: mock(() => mockClient) },
      });

      const workflows = await service.listWorkflows();
      expect(workflows).toHaveLength(1);
      expect(workflows[0]!.name).toBe("WF1");
    });

    it("lists workflows from a named company", async () => {
      const mockClient = createMockClient();
      (mockClient.listWorkflows as any).mockImplementation(() =>
        Promise.resolve([{ id: "2", name: "WF2", active: false }]),
      );

      const service = createService({
        clientPort: { createClient: mock(() => mockClient) },
        secrets: { getSecret: mock(() => Promise.resolve("acme-key")) },
      });

      const workflows = await service.listWorkflows("acme");
      expect(workflows).toHaveLength(1);
    });
  });

  describe("addCompanyApiKey", () => {
    it("validates API key and stores in Infisical", async () => {
      const mockClient = createMockClient();
      const setSecret = mock(() => Promise.resolve());

      const service = createService({
        clientPort: { createClient: mock(() => mockClient) },
        secrets: { setSecret },
      });

      await service.addCompanyApiKey("acme", "api-key");

      expect(mockClient.listWorkflows).toHaveBeenCalled();
      expect(setSecret).toHaveBeenCalledWith(
        "N8N_API_KEY",
        "api-key",
        "/companies/acme",
      );
    });
  });

  describe("listCompanies", () => {
    it("lists company folders from Infisical", async () => {
      const listFolders = mock(() => Promise.resolve(["acme", "bigcorp"]));

      const service = createService({
        clientPort: { createClient: mock() },
        secrets: { listFolders },
      });

      const companies = await service.listCompanies();
      expect(companies).toEqual(["acme", "bigcorp"]);
      expect(listFolders).toHaveBeenCalledWith("/companies");
    });
  });

  describe("deleteWorkflow", () => {
    it("deletes and returns the workflow name", async () => {
      const mockClient = createMockClient();
      (mockClient.getWorkflow as any).mockImplementation(() =>
        Promise.resolve({ id: "42", name: "My WF" }),
      );

      const service = createService({
        clientPort: { createClient: mock(() => mockClient) },
      });

      const name = await service.deleteWorkflow("42");
      expect(name).toBe("My WF");
      expect(mockClient.deleteWorkflow).toHaveBeenCalledWith("42");
    });
  });
});
