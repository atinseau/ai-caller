import { describe, expect, it, mock } from "bun:test";
import { N8nService } from "../../src/application/services/n8n.service.ts";
import { N8nSanitizeService } from "../../src/application/services/n8n-sanitize.service.ts";
import type {
  N8nClient,
  N8nWorkflow,
} from "../../src/domain/models/n8n.model.ts";
import type { N8nClientPort } from "../../src/domain/ports/n8n-client.port.ts";
import type { N8nWorkflowStoragePort } from "../../src/domain/ports/n8n-workflow-storage.port.ts";
import type { SecretManagerPort } from "../../src/domain/ports/secret-manager.port.ts";

const emptyWorkflow = {} as N8nWorkflow;

function createMockClient(): N8nClient {
  return {
    getWorkflow: mock(() => Promise.resolve(emptyWorkflow)),
    listWorkflows: mock(() => Promise.resolve([])),
    createWorkflow: mock(() => Promise.resolve(emptyWorkflow)),
    updateWorkflow: mock(() => Promise.resolve(emptyWorkflow)),
    deleteWorkflow: mock(() => Promise.resolve()),
    activateWorkflow: mock(() => Promise.resolve(emptyWorkflow)),
    deactivateWorkflow: mock(() => Promise.resolve(emptyWorkflow)),
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
      const mockClient = {
        ...createMockClient(),
        listWorkflows: mock(() =>
          Promise.resolve([
            {
              id: "1",
              name: "WF1",
              active: true,
              nodes: [],
              connections: {},
            } as N8nWorkflow,
          ]),
        ),
      };

      const service = createService({
        clientPort: { createClient: mock(() => mockClient) },
      });

      const workflows = await service.listWorkflows();
      expect(workflows).toHaveLength(1);
      expect(workflows[0]?.name).toBe("WF1");
    });

    it("lists workflows from a named company", async () => {
      const mockClient = {
        ...createMockClient(),
        listWorkflows: mock(() =>
          Promise.resolve([
            {
              id: "2",
              name: "WF2",
              active: false,
              nodes: [],
              connections: {},
            } as N8nWorkflow,
          ]),
        ),
      };

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
      const mockClient = {
        ...createMockClient(),
        getWorkflow: mock(() =>
          Promise.resolve({
            id: "42",
            name: "My WF",
            active: true,
            nodes: [],
            connections: {},
          } as N8nWorkflow),
        ),
      };

      const service = createService({
        clientPort: { createClient: mock(() => mockClient) },
      });

      const name = await service.deleteWorkflow("42");
      expect(name).toBe("My WF");
      expect(mockClient.deleteWorkflow).toHaveBeenCalledWith("42");
    });
  });
});
