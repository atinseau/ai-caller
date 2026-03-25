import type { GenerationType } from "@/domain/enums/generation-type.enum.ts";
import type { PromptSection } from "@/domain/enums/prompt-section.enum.ts";

export type SystemPromptSectionPayload = {
  type: typeof GenerationType.SYSTEM_PROMPT_SECTION;
  companyId: string;
  section: PromptSection;
  promptSections: Partial<Record<PromptSection, string>>;
  userMessage: string;
};

// Discriminated union — extend with new types here
export type GenerationRequest = SystemPromptSectionPayload;

export abstract class TextGenerationPort {
  abstract generate(request: GenerationRequest): Promise<string>;
}
