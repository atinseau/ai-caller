import type { N8nClient } from "@/domain/models/n8n.model.ts";

export abstract class N8nClientPort {
  abstract createClient(baseUrl: string, apiKey: string): N8nClient;
}
