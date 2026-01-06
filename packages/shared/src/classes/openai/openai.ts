import type { OpenAIConfig } from "../../types/openai.types";
import { OpenAIRealtime } from "./openai-realtime";

export class OpenAI {
  constructor(private readonly config: OpenAIConfig) {}

  get realtime() {
    return new OpenAIRealtime(this.config);
  }
}
