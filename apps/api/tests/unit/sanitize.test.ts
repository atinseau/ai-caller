import { describe, expect, it } from "bun:test";
import { N8nSanitizeService } from "../../src/application/services/n8n-sanitize.service.ts";
import type { N8nWorkflow } from "../../src/domain/models/n8n.model.ts";

const svc = new N8nSanitizeService();
const sanitizeWorkflow = svc.sanitize.bind(svc);
const prepareForPush = svc.prepareForPush.bind(svc);

const makeWorkflow = (overrides: Partial<N8nWorkflow> = {}): N8nWorkflow => ({
  id: "123",
  name: "Test Workflow",
  active: true,
  versionId: "v1",
  staticData: { lastExecution: "2024-01-01" },
  nodes: [
    {
      id: "node1",
      name: "Google Sheets",
      type: "n8n-nodes-base.googleSheets",
      position: [250, 300],
      parameters: { operation: "read", sheetId: "abc" },
      credentials: {
        googleSheetsOAuth2Api: { id: "cred-42", name: "My Google" },
      },
      typeVersion: 4,
    },
    {
      id: "node2",
      name: "Start",
      type: "n8n-nodes-base.start",
      position: [100, 300],
      parameters: {},
    },
  ],
  connections: {
    Start: { main: [[{ node: "Google Sheets", type: "main", index: 0 }]] },
  },
  settings: { executionOrder: "v1" },
  tags: [
    { id: "tag1", name: "production" },
    { id: "tag2", name: "crm" },
  ],
  pinData: { "Google Sheets": [{ json: { test: true } }] },
  ...overrides,
});

describe("sanitizeWorkflow", () => {
  it("strips instance-specific fields", () => {
    const result = sanitizeWorkflow(makeWorkflow());

    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("active");
    expect(result).not.toHaveProperty("staticData");
    expect(result).not.toHaveProperty("versionId");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
  });

  it("strips credentials from nodes", () => {
    const result = sanitizeWorkflow(makeWorkflow());

    for (const node of result.nodes) {
      expect(node).not.toHaveProperty("credentials");
    }
  });

  it("strips node id and webhookId", () => {
    const workflow = makeWorkflow({
      nodes: [
        {
          id: "node1",
          name: "Trigger",
          type: "n8n-nodes-base.webhook",
          position: [0, 0],
          parameters: {},
          webhookId: "webhook-123",
        },
      ],
    });
    const result = sanitizeWorkflow(workflow);

    expect(result.nodes[0]).not.toHaveProperty("id");
    expect(result.nodes[0]).not.toHaveProperty("webhookId");
    expect(result.nodes[0]?.name).toBe("Trigger");
  });

  it("preserves node parameters and structure", () => {
    const result = sanitizeWorkflow(makeWorkflow());
    const sheetsNode = result.nodes.find((n) => n.name === "Google Sheets");

    expect(sheetsNode).toBeDefined();
    expect(sheetsNode?.type).toBe("n8n-nodes-base.googleSheets");
    expect(sheetsNode?.parameters).toEqual({
      operation: "read",
      sheetId: "abc",
    });
    expect(sheetsNode?.position).toEqual([250, 300]);
  });

  it("preserves connections", () => {
    const result = sanitizeWorkflow(makeWorkflow());
    expect(result.connections).toEqual({
      Start: { main: [[{ node: "Google Sheets", type: "main", index: 0 }]] },
    });
  });

  it("preserves name, settings, pinData", () => {
    const result = sanitizeWorkflow(makeWorkflow());

    expect(result.name).toBe("Test Workflow");
    expect(result.settings).toEqual({ executionOrder: "v1" });
    expect(result.pinData).toEqual({
      "Google Sheets": [{ json: { test: true } }],
    });
  });

  it("strips tag IDs but keeps names", () => {
    const result = sanitizeWorkflow(makeWorkflow());

    expect(result.tags).toEqual([{ name: "production" }, { name: "crm" }]);
  });

  it("handles nodes without credentials", () => {
    const result = sanitizeWorkflow(makeWorkflow());
    const startNode = result.nodes.find((n) => n.name === "Start");

    expect(startNode).toBeDefined();
    expect(startNode).not.toHaveProperty("credentials");
  });

  it("handles workflow with no tags", () => {
    const result = sanitizeWorkflow(makeWorkflow({ tags: undefined }));
    expect(result.tags).toBeUndefined();
  });

  it("handles workflow with empty tags", () => {
    const result = sanitizeWorkflow(makeWorkflow({ tags: [] }));
    expect(result.tags).toBeUndefined();
  });

  it("handles workflow with no settings", () => {
    const result = sanitizeWorkflow(makeWorkflow({ settings: undefined }));
    expect(result.settings).toBeUndefined();
  });

  it("handles workflow with no pinData", () => {
    const result = sanitizeWorkflow(makeWorkflow({ pinData: undefined }));
    expect(result.pinData).toBeUndefined();
  });

  it("handles empty nodes array", () => {
    const result = sanitizeWorkflow(makeWorkflow({ nodes: [] }));
    expect(result.nodes).toEqual([]);
  });
});

describe("prepareForPush", () => {
  it("does not include active (read-only on create)", () => {
    const generic = sanitizeWorkflow(makeWorkflow());
    const result = prepareForPush(generic);

    expect(result).not.toHaveProperty("active");
  });

  it("strips pinData", () => {
    const generic = sanitizeWorkflow(makeWorkflow());
    const result = prepareForPush(generic);

    expect(result).not.toHaveProperty("pinData");
  });

  it("preserves all generic workflow fields", () => {
    const generic = sanitizeWorkflow(makeWorkflow());
    const result = prepareForPush(generic);

    expect(result.name).toBe(generic.name);
    expect(result.nodes.length).toBe(generic.nodes.length);
    expect(result.connections).toEqual(generic.connections);
  });
});
