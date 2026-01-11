import { ContainerModule } from "inversify";
import { RealtimeGatewayPort } from "@/application/ports/realtime-gateway.port";
import { OpenAIRealtimeGateway } from "@/infrastructure/gateway/openai-realtime.gateway";

export const gatewayModule = new ContainerModule((module) => {
  module.bind(RealtimeGatewayPort).to(OpenAIRealtimeGateway).inSingletonScope();
});
