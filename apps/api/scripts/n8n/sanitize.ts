import type { N8nNode, N8nWorkflow } from "./client";

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
    const { credentials, ...rest } = node;
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
  return {
    ...generic,
    nodes: generic.nodes as N8nNode[],
    active: false,
  };
}
