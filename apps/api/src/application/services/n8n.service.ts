import { inject, injectable } from "inversify";
import type { N8nClient, N8nWorkflow } from "@/domain/models/n8n.model.ts";
import { N8nClientPort } from "@/domain/ports/n8n-client.port.ts";
import { N8nWorkflowStoragePort } from "@/domain/ports/n8n-workflow-storage.port.ts";
import { SecretManagerPort } from "@/domain/ports/secret-manager.port.ts";
import { env } from "@/infrastructure/config/env.ts";
import { N8nSanitizeService } from "./n8n-sanitize.service.ts";

export interface PullResult {
  name: string;
  filename: string;
}

export interface PushResult {
  name: string;
  id: string;
  created: boolean;
}

@injectable()
export class N8nService {
  constructor(
    @inject(N8nClientPort)
    private readonly clientPort: N8nClientPort,
    @inject(N8nWorkflowStoragePort)
    private readonly storagePort: N8nWorkflowStoragePort,
    @inject(SecretManagerPort)
    private readonly secrets: SecretManagerPort,
    @inject(N8nSanitizeService)
    private readonly sanitize: N8nSanitizeService,
  ) {}

  // --- Account management ---

  async addCompanyApiKey(companyName: string, apiKey: string): Promise<void> {
    // Validate by attempting to list workflows
    const host = env.get("N8N_URL");
    const client = this.clientPort.createClient(host, apiKey);
    await client.listWorkflows();
    await this.secrets.setSecret(
      "N8N_API_KEY",
      apiKey,
      `/companies/${companyName}`,
    );
  }

  listCompanies(): Promise<string[]> {
    return this.secrets.listFolders("/companies");
  }

  // --- Workflow operations ---

  async listWorkflows(companyName?: string): Promise<N8nWorkflow[]> {
    const client = await this.resolveClient(companyName);
    return client.listWorkflows();
  }

  async pull(id?: string, from?: string): Promise<PullResult[]> {
    const client = await this.resolveClient(from);
    const results: PullResult[] = [];

    if (id) {
      const result = await this.pullOne(client, id);
      results.push(result);
    } else {
      const workflows = await client.listWorkflows();
      for (const wf of workflows) {
        const result = await this.pullOne(client, wf.id);
        results.push(result);
      }
    }

    return results;
  }

  async push(companyName: string, file: string): Promise<PushResult> {
    const client = await this.resolveClient(companyName);
    const generic = await this.storagePort.load(file);
    const payload = this.sanitize.prepareForPush(generic);

    const existing = await client.listWorkflows();
    const match = existing.find((w) => w.name === generic.name);

    if (match) {
      await client.updateWorkflow(match.id, payload);
      return { name: generic.name, id: match.id, created: false };
    }

    const created = await client.createWorkflow(payload);
    return { name: generic.name, id: created.id, created: true };
  }

  async deleteWorkflow(id: string, from?: string): Promise<string> {
    const client = await this.resolveClient(from);
    const workflow = await client.getWorkflow(id);
    await client.deleteWorkflow(id);
    return workflow.name;
  }

  // --- API usage (for application services) ---

  getClientForCompany(companyName: string): Promise<N8nClient> {
    return this.resolveClient(companyName);
  }

  // --- Private helpers ---

  private async pullOne(client: N8nClient, id: string): Promise<PullResult> {
    const workflow = await client.getWorkflow(id);
    const generic = this.sanitize.sanitize(workflow);
    const filename = `${this.sanitize.slugify(workflow.name)}.json`;
    await this.storagePort.save(filename, generic);
    return { name: workflow.name, filename };
  }

  private async resolveClient(companyName?: string): Promise<N8nClient> {
    const host = env.get("N8N_URL");
    if (companyName) {
      let apiKey: string;
      try {
        apiKey = await this.secrets.getSecret(
          "N8N_API_KEY",
          `/companies/${companyName}`,
        );
      } catch {
        throw new Error(
          `Company "${companyName}" not found. Use \`bun n8n add\` to register it.`,
        );
      }
      return this.clientPort.createClient(host, apiKey);
    }
    const apiKey = env.get("N8N_API_KEY");
    return this.clientPort.createClient(host, apiKey);
  }
}
