import { z } from "@hono/zod-openapi";

export const SendMessageResponseDto = z
  .object({
    message: z.string().openapi({ description: "Status message" }),
  })
  .openapi("SendMessageResponseDto", {
    description: "Response DTO for sending a text message",
  });

export type ISendMessageResponseDto = z.infer<typeof SendMessageResponseDto>;
