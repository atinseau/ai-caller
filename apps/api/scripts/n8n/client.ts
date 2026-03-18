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

interface N8nListResponse<T> {
  data: T[];
  nextCursor?: string;
}

export interface N8nClient {
  getWorkflow(id: string): Promise<N8nWorkflow>;
  listWorkflows(): Promise<N8nWorkflow[]>;
  createWorkflow(data: Omit<N8nWorkflow, "id">): Promise<N8nWorkflow>;
  updateWorkflow(
    id: string,
    data: Partial<N8nWorkflow>,
  ): Promise<N8nWorkflow>;
  deleteWorkflow(id: string): Promise<void>;
  activateWorkflow(id: string): Promise<N8nWorkflow>;
  deactivateWorkflow(id: string): Promise<N8nWorkflow>;
}

export function createClient(baseUrl: string, apiKey: string): N8nClient {
  const headers = {
    "X-N8N-API-KEY": apiKey,
    "Content-Type": "application/json",
  };

  async function request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${baseUrl}/api/v1${path}`;
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const body = await response.text();
      const messages: Record<number, string> = {
        401: "Invalid API key",
        403: "Insufficient permissions",
        404: "Resource not found",
      };
      const message = messages[response.status] ?? `HTTP ${response.status}`;
      throw new Error(`n8n API error: ${message} — ${body}`);
    }

    return response.json() as Promise<T>;
  }

  return {
    async getWorkflow(id: string) {
      return request<N8nWorkflow>(`/workflows/${id}`);
    },

    async listWorkflows() {
      const result =
        await request<N8nListResponse<N8nWorkflow>>("/workflows");
      return result.data;
    },

    async createWorkflow(data) {
      return request<N8nWorkflow>("/workflows", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async deleteWorkflow(id) {
      await request<void>(`/workflows/${id}`, { method: "DELETE" });
    },

    async updateWorkflow(id, data) {
      return request<N8nWorkflow>(`/workflows/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async activateWorkflow(id) {
      return request<N8nWorkflow>(`/workflows/${id}/activate`, {
        method: "POST",
      });
    },

    async deactivateWorkflow(id) {
      return request<N8nWorkflow>(`/workflows/${id}/deactivate`, {
        method: "POST",
      });
    },
  };
}
