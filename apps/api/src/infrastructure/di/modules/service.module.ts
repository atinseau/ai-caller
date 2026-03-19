import { ContainerModule } from "inversify";
import { McpToolDiscoveryService } from "@/application/services/mcp-tool-discovery.service";
import { N8nService } from "@/application/services/n8n.service";
import { N8nSanitizeService } from "@/application/services/n8n-sanitize.service";
import { OpenAICallService } from "@/application/services/openai-call.service";
import { RealtimeSessionService } from "@/application/services/realtime-session.service";
import { SubAgentService } from "@/application/services/sub-agent.service";
import { LoggerPort } from "@/domain/ports/logger.port";
import { PromptPort } from "@/domain/ports/prompt.port";
import { RealtimeSessionPort } from "@/domain/ports/realtime-session.port";
import { SubAgentPort } from "@/domain/ports/sub-agent.port";
import { TextStreamPort } from "@/domain/ports/text-stream.port";
import { CallServicePort } from "@/domain/services/call-service.port";
import { LoggerAdapter } from "@/infrastructure/logger/logger.adapter";
import { HandlebarsPromptAdapter } from "@/infrastructure/prompt/handlebars-prompt.adapter";
import { InMemoryTextStream } from "@/infrastructure/stream/in-memory-text-stream";

export const serviceModule = new ContainerModule((module) => {
  module.bind(LoggerPort).to(LoggerAdapter).inSingletonScope();
  module.bind(PromptPort).to(HandlebarsPromptAdapter).inSingletonScope();
  module.bind(CallServicePort).to(OpenAICallService).inSingletonScope();
  module
    .bind(RealtimeSessionPort)
    .to(RealtimeSessionService)
    .inSingletonScope();
  module.bind(TextStreamPort).to(InMemoryTextStream).inSingletonScope();
  module.bind(SubAgentPort).to(SubAgentService).inSingletonScope();
  module.bind(McpToolDiscoveryService).toSelf().inSingletonScope();
  module.bind(N8nSanitizeService).toSelf().inSingletonScope();
  module.bind(N8nService).toSelf().inSingletonScope();
});
