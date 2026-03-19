import { ContainerModule } from "inversify";
import { McpClientPort } from "@/domain/ports/mcp-client.port";
import { N8nClientPort } from "@/domain/ports/n8n-client.port";
import { N8nWorkflowStoragePort } from "@/domain/ports/n8n-workflow-storage.port";
import { RealtimeGatewayPort } from "@/domain/ports/realtime-gateway.port";
import { SecretManagerPort } from "@/domain/ports/secret-manager.port";
import { OpenAIRealtimeGateway } from "@/infrastructure/gateway/openai-realtime.gateway";
import { McpClientAdapter } from "@/infrastructure/mcp/mcp-client.adapter";
import { N8nClientAdapter } from "@/infrastructure/n8n/n8n-client.adapter";
import { N8nWorkflowFileStorageAdapter } from "@/infrastructure/n8n/n8n-workflow-file-storage.adapter";
import { InfisicalSecretAdapter } from "@/infrastructure/secret/infisical-secret.adapter";

export const gatewayModule = new ContainerModule((module) => {
  module
    .bind(RealtimeGatewayPort)
    .to(OpenAIRealtimeGateway)
    .inSingletonScope();
  module.bind(McpClientPort).to(McpClientAdapter).inSingletonScope();
  module
    .bind(SecretManagerPort)
    .to(InfisicalSecretAdapter)
    .inSingletonScope();
  module.bind(N8nClientPort).to(N8nClientAdapter).inSingletonScope();
  module
    .bind(N8nWorkflowStoragePort)
    .to(N8nWorkflowFileStorageAdapter)
    .inSingletonScope();
});
