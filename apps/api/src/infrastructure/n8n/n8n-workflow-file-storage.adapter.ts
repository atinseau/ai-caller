import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { injectable } from "inversify";
import type { GenericWorkflow } from "@/domain/models/n8n.model.ts";
import { N8nWorkflowStoragePort } from "@/domain/ports/n8n-workflow-storage.port.ts";

const WORKFLOWS_DIR = join(import.meta.dir, "../../../workflows");

@injectable()
export class N8nWorkflowFileStorageAdapter extends N8nWorkflowStoragePort {
  async save(filename: string, workflow: GenericWorkflow): Promise<void> {
    const filepath = join(WORKFLOWS_DIR, filename);
    await Bun.write(filepath, JSON.stringify(workflow, null, 2));
  }

  async load(filename: string): Promise<GenericWorkflow> {
    const name = filename.endsWith(".json") ? filename : `${filename}.json`;
    const filepath = join(WORKFLOWS_DIR, name);
    const file = Bun.file(filepath);
    if (!(await file.exists())) {
      throw new Error(`Workflow file "${name}" not found`);
    }
    return file.json();
  }

  async list(): Promise<string[]> {
    try {
      const entries = await readdir(WORKFLOWS_DIR);
      return entries.filter((e) => e.endsWith(".json"));
    } catch {
      return [];
    }
  }
}
