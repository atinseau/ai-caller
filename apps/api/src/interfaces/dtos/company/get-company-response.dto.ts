import { z } from "@hono/zod-openapi";
import { McpStatus } from "@/domain/enums/mcp-status.enum.ts";
import { CompanyModel } from "@/domain/models/company.model.ts";

export const GetCompanyResponseDto = z
  .object({
    company: CompanyModel,
    mcpStatus: z.enum(McpStatus).openapi({
      description: "Real-time connectivity status of the MCP server",
      example: McpStatus.NOT_CONFIGURED,
    }),
  })
  .openapi("GetCompanyResponseDto", {
    description: "Response DTO for getting a single company",
  });

export type IGetCompanyResponseDto = z.infer<typeof GetCompanyResponseDto>;
