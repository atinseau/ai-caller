import type { OpenAIConfig } from "../../types/openai.types.ts";
import { OpenAIRealtime } from "./openai-realtime.ts";

export class OpenAI {
  constructor(private readonly config: OpenAIConfig) {}

  get realtime() {
    return new OpenAIRealtime(this.config);
  }
}
