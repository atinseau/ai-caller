import { z } from "@hono/zod-openapi";

export const AttachCallToRoomResponseDto = z
  .object({
    message: z.string().openapi({ description: "Response message" }),
  })
  .openapi("AttachCallToRoomResponseDto", {
    description: "Response DTO for attaching a call to a room",
  });
