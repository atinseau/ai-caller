import { ContainerModule } from "inversify";
import { McpClientPort } from "@/domain/ports/mcp-client.port.ts";
import { N8nClientPort } from "@/domain/ports/n8n-client.port.ts";
import { N8nWorkflowStoragePort } from "@/domain/ports/n8n-workflow-storage.port.ts";
import { RealtimeGatewayPort } from "@/domain/ports/realtime-gateway.port.ts";
import { SecretManagerPort } from "@/domain/ports/secret-manager.port.ts";
import { OpenAIRealtimeGateway } from "@/infrastructure/gateway/openai-realtime.gateway.ts";
import { McpClientAdapter } from "@/infrastructure/mcp/mcp-client.adapter.ts";
import { N8nClientAdapter } from "@/infrastructure/n8n/n8n-client.adapter.ts";
import { N8nWorkflowFileStorageAdapter } from "@/infrastructure/n8n/n8n-workflow-file-storage.adapter.ts";
import { InfisicalSecretAdapter } from "@/infrastructure/secret/infisical-secret.adapter.ts";

export const gatewayModule = new ContainerModule((module) => {
  module.bind(RealtimeGatewayPort).to(OpenAIRealtimeGateway).inSingletonScope();
  module.bind(McpClientPort).to(McpClientAdapter).inSingletonScope();
  module.bind(SecretManagerPort).to(InfisicalSecretAdapter).inSingletonScope();
  module.bind(N8nClientPort).to(N8nClientAdapter).inSingletonScope();
  module
    .bind(N8nWorkflowStoragePort)
    .to(N8nWorkflowFileStorageAdapter)
    .inSingletonScope();
});
