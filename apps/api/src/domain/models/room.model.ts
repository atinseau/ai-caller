import { z } from "@hono/zod-openapi";

export const RoomModel = z
  .object({
    id: z
      .uuidv7()
      .openapi({ description: "The unique identifier of the room" }),
    companyId: z.uuidv7().openapi({
      description: "The unique identifier of the associated company",
    }),
    createdAt: z
      .date()
      .openapi({ description: "The creation timestamp of the room" }),
    updatedAt: z
      .date()
      .openapi({ description: "The last update timestamp of the room" }),
    expiresAt: z
      .date()
      .openapi({ description: "The expiration timestamp of the room" }),
    token: z.string().openapi({ description: "The access token for the room" }),
    callId: z
      .string()
      .nullable()
      .optional()
      .openapi({ description: "The associated call ID, if any" }),
  })
  .openapi("RoomModel", {
    description: "Represents a room entity",
  });

export type IRoomModel = z.infer<typeof RoomModel>;
