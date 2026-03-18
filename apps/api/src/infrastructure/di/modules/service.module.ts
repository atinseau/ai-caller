import { ContainerModule } from "inversify";
import { OpenAICallService } from "@/application/services/openai-call.service";
import { RealtimeSessionService } from "@/application/services/realtime-session.service";
import { LoggerPort } from "@/domain/ports/logger.port";
import { RealtimeSessionPort } from "@/domain/ports/realtime-session.port";
import { CallServicePort } from "@/domain/services/call-service.port";
import { LoggerAdapter } from "@/infrastructure/logger/logger.adapter";

export const serviceModule = new ContainerModule((module) => {
  module.bind(LoggerPort).to(LoggerAdapter).inSingletonScope();
  module.bind(CallServicePort).to(OpenAICallService).inSingletonScope();
  module.bind(RealtimeSessionPort).to(RealtimeSessionService).inSingletonScope();
});
