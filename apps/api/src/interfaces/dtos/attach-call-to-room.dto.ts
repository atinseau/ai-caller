import z from "zod";

export const AttachCallToRoomDto = z.object({
  roomId: z.uuidv7(),
  id: z.string(),
});

export type IAttachCallToRoomDto = z.infer<typeof AttachCallToRoomDto>;
