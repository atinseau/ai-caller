export type BaseOpenAIConfig = {
  model?: string;
  apiKey: string;
};

export class BaseOpenAI {
  private BASE_URL = "https://api.openai.com/v1";

  constructor(public readonly config: BaseOpenAIConfig) {}

  public fetch(path: string, options?: RequestInit) {
    return fetch(`${this.BASE_URL}${path}`, options);
  }
}
