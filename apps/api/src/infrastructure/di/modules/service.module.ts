import { ContainerModule } from "inversify";
import { ContactService } from "@/application/services/contact.service.ts";
import { McpToolDiscoveryService } from "@/application/services/mcp-tool-discovery.service.ts";
import { N8nService } from "@/application/services/n8n.service.ts";
import { N8nSanitizeService } from "@/application/services/n8n-sanitize.service.ts";
import { OpenAICallService } from "@/application/services/openai-call.service.ts";
import { OpenAIChatService } from "@/application/services/openai-chat.service.ts";
import { RealtimeSessionService } from "@/application/services/realtime-session.service.ts";
import { SubAgentService } from "@/application/services/sub-agent.service.ts";
import { TextGenerationService } from "@/application/services/text-generation.service.ts";
import { ToolExecutionService } from "@/application/services/tool-execution.service.ts";
import { ChatServicePort } from "@/domain/ports/chat-service.port.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { PromptPort } from "@/domain/ports/prompt.port.ts";
import { RealtimeSessionPort } from "@/domain/ports/realtime-session.port.ts";
import { SubAgentPort } from "@/domain/ports/sub-agent.port.ts";
import { TextGenerationPort } from "@/domain/ports/text-generation.port.ts";
import { TextStreamPort } from "@/domain/ports/text-stream.port.ts";
import { CallServicePort } from "@/domain/services/call-service.port.ts";
import { LoggerAdapter } from "@/infrastructure/logger/logger.adapter.ts";
import { HandlebarsPromptAdapter } from "@/infrastructure/prompt/handlebars-prompt.adapter.ts";
import { InMemoryTextStream } from "@/infrastructure/stream/in-memory-text-stream.ts";

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
  module.bind(ToolExecutionService).toSelf().inSingletonScope();
  module.bind(ChatServicePort).to(OpenAIChatService).inSingletonScope();
  module.bind(McpToolDiscoveryService).toSelf().inSingletonScope();
  module.bind(N8nSanitizeService).toSelf().inSingletonScope();
  module.bind(N8nService).toSelf().inSingletonScope();
  module.bind(ContactService).toSelf().inSingletonScope();
  module.bind(TextGenerationPort).to(TextGenerationService).inSingletonScope();
});
