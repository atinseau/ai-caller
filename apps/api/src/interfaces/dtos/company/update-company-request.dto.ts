import { z } from "@hono/zod-openapi";
import { CompanyStatus } from "@/domain/enums/company-status.enum.ts";
import { LanguageEnum } from "@/domain/enums/language.enum.ts";
import { VadEagernessEnum } from "@/domain/enums/vad-eagerness.enum.ts";
import {
  SystemPromptSectionsSchema,
  SystemToolPromptsSchema,
  ToolConfigsSchema,
} from "@/domain/models/company.model.ts";

export const UpdateCompanyRequestDto = z
  .object({
    name: z.string().optional().openapi({
      description: "The name of the company",
      example: "Acme Corp",
    }),
    mcpUrl: z.string().nullable().optional().openapi({
      description: "The MCP server URL of the company",
      example: "https://mcp.acme-corp.com",
    }),
    status: z.enum(CompanyStatus).optional().openapi({
      description: "The status of the company",
      example: CompanyStatus.ACTIVE,
    }),
    systemPromptSections: SystemPromptSectionsSchema.optional().openapi({
      description:
        "The system prompt sections (role, personality, context, pronunciations, instructions, flow, safety)",
    }),
    description: z.string().nullable().optional().openapi({
      description: "A short description of the company",
      example: "Leading provider of innovative solutions",
    }),
    toolConfigs: ToolConfigsSchema.optional().openapi({
      description:
        "Per-tool configuration overrides (display name, description, parameter descriptions)",
    }),
    systemToolPrompts: SystemToolPromptsSchema.optional().openapi({
      description:
        "Per-system-tool custom prompt overrides (e.g. close_call, get_tool_status)",
    }),
    voice: z.string().nullable().optional().openapi({
      description: "The voice ID used by the AI agent (provider-specific)",
      example: "eve",
    }),
    language: z.enum(LanguageEnum).nullable().optional().openapi({
      description: "The language code (ISO 639-1)",
      example: LanguageEnum.FR,
    }),
    vadEagerness: z.enum(VadEagernessEnum).nullable().optional().openapi({
      description: "VAD eagerness level",
      example: VadEagernessEnum.MEDIUM,
    }),
  })
  .openapi("UpdateCompanyRequestDto", {
    description: "Data Transfer Object for updating a company",
  });

export type IUpdateCompanyRequestDto = z.infer<typeof UpdateCompanyRequestDto>;
