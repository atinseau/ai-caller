import { z } from "@hono/zod-openapi";

export const ToolInvokeRequestDto = z
  .object({
    // TODO
  })
  .openapi("ToolInvokeRequestDto", {
    description: "DTO for invoking a tool",
  });
