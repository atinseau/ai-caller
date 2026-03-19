import { z } from "@hono/zod-openapi";
import { CompanyStatus } from "@/domain/enums/company-status.enum.ts";

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
    systemPrompt: z.string().nullable().openapi({
      description: "The main system prompt of the company",
      example: "You are a helpful assistant for Acme Corp.",
    }),
    description: z.string().nullable().openapi({
      description: "A short description of the company",
      example: "Leading provider of innovative solutions",
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
