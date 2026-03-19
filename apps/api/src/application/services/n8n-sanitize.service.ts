import { injectable } from "inversify";
import type {
  N8nWorkflow,
  N8nWorkflowPayload,
  GenericWorkflow,
} from "@/domain/models/n8n.model";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

@injectable()
export class N8nSanitizeService {
  sanitize(workflow: N8nWorkflow): GenericWorkflow {
    const nodes = workflow.nodes.map((node) => {
      const { credentials, id, webhookId, ...rest } = node;
      if (rest.parameters?.path && isUuid(rest.parameters.path as string)) {
        const { path, ...params } = rest.parameters;
        return { ...rest, parameters: params };
      }
      return rest;
    });

    const tags = workflow.tags?.map(({ name }) => ({ name }));

    return {
      name: workflow.name,
      nodes,
      connections: workflow.connections,
      ...(workflow.settings && { settings: workflow.settings }),
      ...(tags?.length && { tags }),
      ...(workflow.pinData && { pinData: workflow.pinData }),
    };
  }

  prepareForPush(generic: GenericWorkflow): N8nWorkflowPayload {
    const { pinData, ...rest } = generic;
    return {
      ...rest,
      nodes: generic.nodes,
    };
  }

  slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
}
