import { z } from "@hono/zod-openapi";
import { RoomModel } from "@/domain/models/room.model";

export const CreateRoomResponseDto = z
  .object({
    message: z.string().openapi({ description: "Response message" }),
    data: RoomModel.openapi({
      description: "The created room details",
    }),
  })
  .openapi("CreateRoomResponseDto", {
    description: "Response DTO for creating a room",
  });

export type ICreateRoomResponseDto = z.infer<typeof CreateRoomResponseDto>;
