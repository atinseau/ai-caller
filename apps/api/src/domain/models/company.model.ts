import { z } from "@hono/zod-openapi";
import { CompanyStatus } from "@/domain/enums/company-status.enum.ts";
import { PromptSection } from "@/domain/enums/prompt-section.enum.ts";

export const ToolParameterConfigSchema = z.object({
  description: z.string().optional(),
});

export const ToolConfigSchema = z.object({
  displayName: z.string().optional(),
  description: z.string().optional(),
  parameters: z.record(z.string(), ToolParameterConfigSchema).optional(),
});

export const ToolConfigsSchema = z
  .record(z.string(), ToolConfigSchema)
  .nullable();

export type IToolConfig = z.infer<typeof ToolConfigSchema>;
export type IToolConfigs = z.infer<typeof ToolConfigsSchema>;

export const SystemToolPromptsSchema = z
  .record(z.string(), z.string())
  .nullable();

export type ISystemToolPrompts = z.infer<typeof SystemToolPromptsSchema>;

export const SystemPromptSectionsSchema = z
  .object({
    [PromptSection.ROLE_OBJECTIVE]: z.string().optional(),
    [PromptSection.PERSONALITY_TONE]: z.string().optional(),
    [PromptSection.CONTEXT]: z.string().optional(),
    [PromptSection.REFERENCE_PRONUNCIATIONS]: z.string().optional(),
    [PromptSection.INSTRUCTIONS_RULES]: z.string().optional(),
    [PromptSection.CONVERSATION_FLOW]: z.string().optional(),
    [PromptSection.SAFETY_ESCALATION]: z.string().optional(),
  })
  .nullable();

export type ISystemPromptSections = z.infer<typeof SystemPromptSectionsSchema>;

export const CompanyModel = z
  .object({
    name: z.string().openapi({
      description: "The name of the company",
      example: "Acme Corp",
    }),
    mcpUrl: z.string().nullable().openapi({
      description: "The MCP server URL of the company",
      example: "https://mcp.acme-corp.com",
    }),
    status: z.enum(CompanyStatus).openapi({
      description: "The status of the company",
      example: CompanyStatus.INACTIVE,
    }),
    systemPromptSections: SystemPromptSectionsSchema.openapi({
      description:
        "The system prompt sections following the OpenAI 8-section skeleton (role, personality, context, pronunciations, instructions, flow, safety)",
    }),
    description: z.string().nullable().openapi({
      description: "A short description of the company",
      example: "Leading provider of innovative solutions",
    }),
    toolConfigs: ToolConfigsSchema.openapi({
      description:
        "Per-tool configuration overrides (display name, description, parameter descriptions)",
    }),
    systemToolPrompts: SystemToolPromptsSchema.openapi({
      description:
        "Per-system-tool custom prompt overrides (e.g. close_call, get_tool_status)",
    }),
    voice: z.string().nullable().openapi({
      description: "The voice used by the AI agent (e.g. marin, cedar, alloy)",
      example: "marin",
    }),
    language: z.string().nullable().openapi({
      description: "The language code for the AI agent (ISO 639-1)",
      example: "fr",
    }),
    vadEagerness: z.string().nullable().openapi({
      description:
        "Voice Activity Detection eagerness level (low, medium, high)",
      example: "medium",
    }),
    id: z.uuidv7().openapi({
      description: "The unique identifier of the company",
      example: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    }),
    createdAt: z.date().openapi({
      description: "The creation timestamp of the company",
      example: "2024-01-01T00:00:00Z",
    }),
    updatedAt: z.date().openapi({
      description: "The last update timestamp of the company",
      example: "2024-01-02T00:00:00Z",
    }),
  })
  .openapi("CompanyModel", {
    description: "Represents a company entity",
  });

export type ICompanyModel = z.infer<typeof CompanyModel>;
