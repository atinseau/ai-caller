import { z } from "@hono/zod-openapi";

export const AttachCallToRoomRequestDto = z
  .object({
    roomId: z.uuidv7().openapi({
      example: "123e4567-e89b-12d3-a456-426614174000",
      description: "The unique identifier of the room",
    }),
    id: z.string().openapi({
      example: "call_abc123",
      description: "The unique identifier of the call to attach",
    }),
  })
  .openapi("AttachCallToRoomRequestDto", {
    description: "Request DTO for attaching a call to a room",
  });

export type IAttachCallToRoomRequestDto = z.infer<
  typeof AttachCallToRoomRequestDto
>;
