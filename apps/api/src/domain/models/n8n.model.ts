export interface N8nAccount {
  name: string;
  host: string;
}

export interface GenericWorkflow {
  name: string;
  nodes: Omit<N8nNode, "credentials" | "id" | "webhookId">[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  tags?: { name: string }[];
  pinData?: Record<string, unknown>;
}

export interface N8nWorkflowPayload {
  name: string;
  nodes: Omit<N8nNode, "id" | "credentials">[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  tags?: { name: string }[];
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: N8nNode[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  staticData?: unknown;
  tags?: { id: string; name: string }[];
  pinData?: Record<string, unknown>;
  versionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
  typeVersion?: number;
  [key: string]: unknown;
}

export interface N8nClient {
  getWorkflow(id: string): Promise<N8nWorkflow>;
  listWorkflows(): Promise<N8nWorkflow[]>;
  createWorkflow(data: N8nWorkflowPayload): Promise<N8nWorkflow>;
  updateWorkflow(id: string, data: N8nWorkflowPayload): Promise<N8nWorkflow>;
  deleteWorkflow(id: string): Promise<void>;
  activateWorkflow(id: string): Promise<N8nWorkflow>;
  deactivateWorkflow(id: string): Promise<N8nWorkflow>;
}
