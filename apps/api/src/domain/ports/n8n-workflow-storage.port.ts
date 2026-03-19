import type { GenericWorkflow } from "@/domain/models/n8n.model";

export abstract class N8nWorkflowStoragePort {
  abstract save(filename: string, workflow: GenericWorkflow): Promise<void>;
  abstract load(filename: string): Promise<GenericWorkflow>;
  abstract list(): Promise<string[]>;
}
