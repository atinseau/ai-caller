import { z } from "@hono/zod-openapi";

export const ToolInvokeResponseDto = z
  .object({
    message: z.string().openapi({ description: "Response message" }),
  })
  .openapi("ToolInvokeResponseDto", {
    description: "DTO for tool invocation response",
  });
