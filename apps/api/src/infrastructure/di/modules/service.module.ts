import { ContainerModule } from "inversify";
import { OpenAICallService } from "@/application/services/openai-call.service";
import { CallServicePort } from "@/domain/services/call-service.port";

export const serviceModule = new ContainerModule((module) => {
  module.bind(CallServicePort).to(OpenAICallService).inSingletonScope();

  // TODO: Register company user access service when it exists.
  // TODO: Register call listing service when it exists.
});
