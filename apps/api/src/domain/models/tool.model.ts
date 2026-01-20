import { z } from "@hono/zod-openapi";

export const ToolInvoke = z.object({
  id: z.uuidv7().openapi({
    description: "Unique identifier for the tool invoke",
  }),
  createdAt: z.date().openapi({
    description: "Timestamp when the tool invoke was created",
  }),
  roomId: z.uuidv7().openapi({
    description: "Unique identifier for the room",
  }),
  args: z.object().openapi({
    description: "Arguments passed to the tool",
  }),
});
