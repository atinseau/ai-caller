import { ContainerModule } from "inversify";
import { McpClientPort } from "@/domain/ports/mcp-client.port";
import { RealtimeGatewayPort } from "@/domain/ports/realtime-gateway.port";
import { OpenAIRealtimeGateway } from "@/infrastructure/gateway/openai-realtime.gateway";
import { McpClientAdapter } from "@/infrastructure/mcp/mcp-client.adapter";

export const gatewayModule = new ContainerModule((module) => {
  module
    .bind(RealtimeGatewayPort)
    .to(OpenAIRealtimeGateway)
    .inSingletonScope();
  module.bind(McpClientPort).to(McpClientAdapter).inSingletonScope();
});
