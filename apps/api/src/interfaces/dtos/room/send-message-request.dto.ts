import { z } from "@hono/zod-openapi";

export const SendMessageRequestDto = z
  .object({
    text: z.string().min(1).openapi({
      description: "The text message to send",
      example: "Bonjour, comment puis-je vous aider ?",
    }),
  })
  .openapi("SendMessageRequestDto", {
    description: "DTO for sending a text message to a room",
  });

export type ISendMessageRequestDto = z.infer<typeof SendMessageRequestDto>;
