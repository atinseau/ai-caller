import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { ToolInvokeResponseDto } from "../dtos/tool/too-invoke-response.dto";
import { ToolInvokeRequestDto } from "../dtos/tool/tool-invoke-request.dto";

export const toolRouter = new OpenAPIHono();

const toolInvokeRoute = createRoute({
  method: "post",
  path: "/invoke",
  request: {
    body: {
      content: {
        "application/json": {
          schema: ToolInvokeRequestDto,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Tool invoked successfully",
      content: {
        "application/json": {
          schema: ToolInvokeResponseDto,
        },
      },
    },
  },
});

toolRouter.openapi(toolInvokeRoute, async (ctx) => {
  console.log(await ctx.req.json());
  return ctx.json({ message: "Tool invoked successfully" });
});
