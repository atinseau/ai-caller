import { z } from "@hono/zod-openapi";

export const ToolInvokeModel = z.object({
  id: z.uuidv7().openapi({
    description: "Unique identifier for the tool invoke",
    example: "0184e2f0-1e5b-7f4c-8000-000000000002",
  }),
  entityId: z.string().openapi({
    description: "Identifier for the entity associated with the tool invoke",
    example: "mcp_call_123456",
  }),
  createdAt: z.date().openapi({
    description: "Timestamp when the tool invoke was created",
    example: "2024-01-01T12:00:00Z",
  }),
  roomId: z.uuidv7().openapi({
    description: "Unique identifier for the room",
    example: "0184e2f0-1e5b-7f4c-8000-000000000001",
  }),
  status: z.enum(["RUNNING", "COMPLETED", "FAILED"]).openapi({
    description: "Status of the tool invocation",
    example: "RUNNING",
  }),
  args: z
    .record(z.unknown())
    .optional()
    .openapi({
      description: "Arguments passed to the tool",
      example: { name: "John doe", age: 30 },
    }),
  results: z
    .record(z.unknown())
    .optional()
    .openapi({
      description: "Results returned from the tool",
      example: { success: true, data: { id: 123 } },
    }),
});

export type IToolInvokeModel = z.infer<typeof ToolInvokeModel>;
