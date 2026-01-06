import { ContainerModule } from "inversify";
import { OpenAICallService } from "@/application/services/openai-call.service";
import { CallServicePort } from "@/domain/services/call-service.port";

export const serviceModule = new ContainerModule((module) => {
  module.bind(CallServicePort).to(OpenAICallService).inSingletonScope();
});
