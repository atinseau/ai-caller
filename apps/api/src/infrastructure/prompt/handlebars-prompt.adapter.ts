import { compile, type TemplateDelegate } from "handlebars";
import { injectable } from "inversify";
import type { PromptPort } from "@/domain/ports/prompt.port.ts";

const PROMPTS_DIR = new URL("../../prompts/", import.meta.url);

@injectable()
export class HandlebarsPromptAdapter implements PromptPort {
  private readonly cache: Map<string, TemplateDelegate> = new Map();

  async render(
    name: string,
    context: Record<string, unknown> = {},
  ): Promise<string> {
    const template = await this.getTemplate(name);
    return template(context);
  }

  private async getTemplate(name: string): Promise<TemplateDelegate> {
    const cached = this.cache.get(name);
    if (cached) return cached;

    const file = Bun.file(new URL(`${name}.md`, PROMPTS_DIR));
    const text = await file.text();
    const template = compile(text);

    this.cache.set(name, template);
    return template;
  }
}
