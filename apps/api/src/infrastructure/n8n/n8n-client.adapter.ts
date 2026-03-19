import { injectable } from "inversify";
import type {
  N8nClient,
  N8nWorkflow,
  N8nWorkflowPayload,
} from "@/domain/models/n8n.model";
import { N8nClientPort } from "@/domain/ports/n8n-client.port";

interface N8nListResponse<T> {
  data: T[];
  nextCursor?: string;
}

@injectable()
export class N8nClientAdapter extends N8nClientPort {
  createClient(baseUrl: string, apiKey: string): N8nClient {
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

      async createWorkflow(data: N8nWorkflowPayload) {
        return request<N8nWorkflow>("/workflows", {
          method: "POST",
          body: JSON.stringify(data),
        });
      },

      async deleteWorkflow(id: string) {
        await request<void>(`/workflows/${id}`, { method: "DELETE" });
      },

      async updateWorkflow(id: string, data: N8nWorkflowPayload) {
        return request<N8nWorkflow>(`/workflows/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      },

      async activateWorkflow(id: string) {
        return request<N8nWorkflow>(`/workflows/${id}/activate`, {
          method: "POST",
        });
      },

      async deactivateWorkflow(id: string) {
        return request<N8nWorkflow>(`/workflows/${id}/deactivate`, {
          method: "POST",
        });
      },
    };
  }
}
