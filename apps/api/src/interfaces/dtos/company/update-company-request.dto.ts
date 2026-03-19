import { z } from "@hono/zod-openapi";
import { CompanyStatus } from "@/domain/enums/company-status.enum.ts";

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
  })
  .openapi("UpdateCompanyRequestDto", {
    description: "Data Transfer Object for updating a company",
  });

export type IUpdateCompanyRequestDto = z.infer<typeof UpdateCompanyRequestDto>;
