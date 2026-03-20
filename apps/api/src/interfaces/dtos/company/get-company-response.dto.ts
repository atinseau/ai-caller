import { z } from "@hono/zod-openapi";
import { McpStatus } from "@/domain/enums/mcp-status.enum.ts";
import { CompanyModel } from "@/domain/models/company.model.ts";

const McpToolDto = z
  .object({
    name: z.string(),
    description: z.string(),
    parameters: z.record(z.string(), z.unknown()),
  })
  .openapi("McpToolDto", {
    description: "A tool discovered from the MCP server",
  });

export const GetCompanyResponseDto = z
  .object({
    company: CompanyModel,
    mcpStatus: z.enum(McpStatus).openapi({
      description: "Real-time connectivity status of the MCP server",
      example: McpStatus.NOT_CONFIGURED,
    }),
    tools: z.array(McpToolDto).openapi({
      description:
        "List of tools discovered from the MCP server (empty if not connected)",
    }),
  })
  .openapi("GetCompanyResponseDto", {
    description: "Response DTO for getting a single company",
  });

export type IGetCompanyResponseDto = z.infer<typeof GetCompanyResponseDto>;
