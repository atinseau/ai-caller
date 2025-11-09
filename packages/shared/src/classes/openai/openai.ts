import { BaseOpenAI, type BaseOpenAIConfig } from "./base-openai";
import { OpenAIRealtime } from "./openai-realtime";

export class OpenAI {
  private readonly client: BaseOpenAI

  constructor(config: BaseOpenAIConfig) {
    this.client = new BaseOpenAI(config);
  }

  get realtime() {
    return new OpenAIRealtime(this.client);
  }
}
