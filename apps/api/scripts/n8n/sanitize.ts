import type { N8nNode, N8nWorkflow } from "./client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export interface GenericWorkflow {
  name: string;
  nodes: Omit<N8nNode, "credentials">[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  tags?: { name: string }[];
  pinData?: Record<string, unknown>;
}

export function sanitizeWorkflow(workflow: N8nWorkflow): GenericWorkflow {
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

export function prepareForPush(
  generic: GenericWorkflow,
): Omit<N8nWorkflow, "id"> {
  const { pinData, ...rest } = generic;
  return {
    ...rest,
    nodes: generic.nodes as N8nNode[],
  };
}
