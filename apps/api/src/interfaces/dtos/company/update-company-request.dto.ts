import { z } from "@hono/zod-openapi";
import { CompanyStatus } from "@/domain/enums/company-status.enum.ts";
import { LanguageEnum } from "@/domain/enums/language.enum.ts";
import { VadEagernessEnum } from "@/domain/enums/vad-eagerness.enum.ts";
import { VoiceEnum } from "@/domain/enums/voice.enum.ts";
import {
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
    systemPrompt: z.string().nullable().optional().openapi({
      description: "The main system prompt of the company",
      example: "You are a helpful assistant for Acme Corp.",
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
    voice: z.nativeEnum(VoiceEnum).nullable().optional().openapi({
      description: "The voice used by the AI agent",
      example: VoiceEnum.MARIN,
    }),
    language: z.nativeEnum(LanguageEnum).nullable().optional().openapi({
      description: "The language code (ISO 639-1)",
      example: LanguageEnum.FR,
    }),
    vadEagerness: z.nativeEnum(VadEagernessEnum).nullable().optional().openapi({
      description: "VAD eagerness level",
      example: VadEagernessEnum.MEDIUM,
    }),
  })
  .openapi("UpdateCompanyRequestDto", {
    description: "Data Transfer Object for updating a company",
  });

export type IUpdateCompanyRequestDto = z.infer<typeof UpdateCompanyRequestDto>;
