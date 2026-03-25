import { inject, injectable } from "inversify";
import { GenerationType } from "@/domain/enums/generation-type.enum.ts";
import { PromptSection } from "@/domain/enums/prompt-section.enum.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { PromptPort } from "@/domain/ports/prompt.port.ts";
import type {
  GenerationRequest,
  SystemPromptSectionPayload,
  TextGenerationPort,
} from "@/domain/ports/text-generation.port.ts";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port.ts";
import { env } from "@/infrastructure/config/env.ts";

const LANGUAGE_LABELS: Record<string, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  ru: "Russian",
  ja: "Japanese",
  zh: "Chinese",
  ko: "Korean",
  ar: "Arabic",
  tr: "Turkish",
};

const SECTION_META: Record<
  PromptSection,
  { label: string; description: string }
> = {
  [PromptSection.ROLE_OBJECTIVE]: {
    label: "Role & Objective",
    description:
      "Who is the AI agent and what is its primary mission? Define the role, scope, and success criteria.",
  },
  [PromptSection.PERSONALITY_TONE]: {
    label: "Personality & Tone",
    description:
      "How should the agent sound? Define the energy, warmth, formality, and conversational style.",
  },
  [PromptSection.CONTEXT]: {
    label: "Context",
    description:
      "Company info, products, services, and knowledge the agent should have.",
  },
  [PromptSection.REFERENCE_PRONUNCIATIONS]: {
    label: "Reference Pronunciations",
    description:
      "Phonetic guides for brand names, technical terms, or proper nouns the agent may need to say aloud.",
  },
  [PromptSection.INSTRUCTIONS_RULES]: {
    label: "Instructions & Rules",
    description:
      "Specific business rules, constraints, do's and don'ts. Hard rules the agent must follow.",
  },
  [PromptSection.CONVERSATION_FLOW]: {
    label: "Conversation Flow",
    description:
      "Define the conversation states, transitions, and expected scenarios.",
  },
  [PromptSection.SAFETY_ESCALATION]: {
    label: "Safety & Escalation",
    description:
      "Define boundaries, fallback behavior, and when/how to escalate to a human agent.",
  },
};

@injectable()
export class TextGenerationService implements TextGenerationPort {
  constructor(
    @inject(PromptPort) private readonly prompt: PromptPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
    @inject(CompanyRepositoryPort)
    private readonly companyRepo: CompanyRepositoryPort,
  ) {}

  generate(request: GenerationRequest): Promise<string> {
    switch (request.type) {
      case GenerationType.SYSTEM_PROMPT_SECTION:
        return this.generatePromptSection(request);
    }
  }

  private async generatePromptSection(
    payload: SystemPromptSectionPayload,
  ): Promise<string> {
    const company = await this.companyRepo.findById(payload.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    // Merge: frontend unsaved sections take priority, fallback to saved company sections
    const savedSections =
      (company.systemPromptSections as Partial<
        Record<PromptSection, string>
      > | null) ?? {};
    const mergedSections: Partial<Record<PromptSection, string>> = {
      ...savedSections,
      ...payload.promptSections,
    };

    const sectionMeta = SECTION_META[payload.section];
    const existingContent = mergedSections[payload.section] ?? "";
    const language = LANGUAGE_LABELS[company.language ?? "en"] ?? "English";

    // Build "other sections" context from merged data
    const otherSectionsLines: string[] = [];
    for (const key of Object.values(PromptSection)) {
      if (key === payload.section) continue;
      const content = mergedSections[key];
      if (content?.trim()) {
        otherSectionsLines.push(
          `**${SECTION_META[key].label}:**\n${content.trim()}`,
        );
      }
    }
    const otherSections = otherSectionsLines.join("\n\n");

    const systemPrompt = await this.prompt.render("generate-prompt-section", {
      sectionName: sectionMeta.label,
      sectionDescription: sectionMeta.description,
      existingContent,
      language,
      otherSections,
      userMessage: payload.userMessage,
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: env.get("TEXT_MODEL"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: payload.userMessage },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `OpenAI generation failed: ${response.status} — ${errorBody}`,
      );
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    // biome-ignore lint/suspicious/noExplicitAny: OpenAI response shape is not typed here
    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    return content.trim();
  }
}
