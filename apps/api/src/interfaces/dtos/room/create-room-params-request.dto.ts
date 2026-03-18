import { z } from "@hono/zod-openapi";

export const CreateRoomParamsRequestDto = z
  .object({
    companyId: z.uuidv7().openapi({
      description: "The ID of the company creating the room",
      example: "123e4567-e89b-12d3-a456-426614174000",
    }),
    modality: z
      .enum(["AUDIO", "TEXT"])
      .default("AUDIO")
      .optional()
      .openapi({
        description: "The communication modality (AUDIO or TEXT)",
        example: "AUDIO",
      }),
  })
  .openapi("CreateRoomParamsRequestDto", {
    description: "DTO for creating a room with the associated company ID",
  });

export type ICreateRoomParamsRequestDto = z.infer<
  typeof CreateRoomParamsRequestDto
>;
