import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  setDefaultTimeout,
} from "bun:test";
import type { N8nClient } from "@/domain/models/n8n.model";
import { N8nClientAdapter } from "@/infrastructure/n8n/n8n-client.adapter";

const hasN8n = !!process.env.N8N_URL && !!process.env.N8N_API_KEY;

setDefaultTimeout(15_000);

describe.skipIf(!hasN8n)("N8nClientAdapter", () => {
  let client: N8nClient;
  let createdWorkflowId: string;

  const testWorkflow = {
    name: `Test Workflow ${Date.now()}`,
    nodes: [
      {
        name: "Start",
        type: "n8n-nodes-base.start",
        position: [100, 300] as [number, number],
        parameters: {},
      },
    ],
    connections: {},
    settings: {
      executionOrder: "v1",
    },
  };

  beforeAll(() => {
    const adapter = new N8nClientAdapter();
    client = adapter.createClient(
      process.env.N8N_URL!,
      process.env.N8N_API_KEY!,
    );
  });

  afterAll(async () => {
    // Cleanup: delete the test workflow if it still exists
    if (createdWorkflowId) {
      try {
        await client.deleteWorkflow(createdWorkflowId);
      } catch {
        // Already deleted
      }
    }
  });

  it("creates a workflow", async () => {
    const workflow = await client.createWorkflow(testWorkflow);

    expect(workflow.id).toBeDefined();
    expect(workflow.name).toBe(testWorkflow.name);
    expect(workflow.active).toBe(false);
    expect(workflow.nodes.length).toBeGreaterThanOrEqual(1);

    createdWorkflowId = workflow.id;
  });

  it("retrieves the workflow by id", async () => {
    const workflow = await client.getWorkflow(createdWorkflowId);

    expect(workflow.id).toBe(createdWorkflowId);
    expect(workflow.name).toBe(testWorkflow.name);
  });

  it("lists workflows and includes the created one", async () => {
    const workflows = await client.listWorkflows();
    const found = workflows.find((w) => w.id === createdWorkflowId);

    expect(found).toBeDefined();
    expect(found?.name).toBe(testWorkflow.name);
  });

  it("updates the workflow", async () => {
    const updatedName = `Updated Workflow ${Date.now()}`;
    const updated = await client.updateWorkflow(createdWorkflowId, {
      ...testWorkflow,
      name: updatedName,
    });

    expect(updated.name).toBe(updatedName);

    // Verify via get
    const fetched = await client.getWorkflow(createdWorkflowId);
    expect(fetched.name).toBe(updatedName);
  });

  it("deletes the workflow", async () => {
    await client.deleteWorkflow(createdWorkflowId);

    // Verify it's gone
    await expect(client.getWorkflow(createdWorkflowId)).rejects.toThrow(
      "Resource not found",
    );

    // Prevent afterAll from trying to delete again
    createdWorkflowId = "";
  });

  it("throws on invalid API key", async () => {
    const adapter = new N8nClientAdapter();
    const badClient = adapter.createClient(process.env.N8N_URL!, "bad-key");

    await expect(badClient.listWorkflows()).rejects.toThrow("Invalid API key");
  });

  it("throws on non-existent workflow", async () => {
    await expect(client.getWorkflow("non-existent-id")).rejects.toThrow(
      "Resource not found",
    );
  });
});
