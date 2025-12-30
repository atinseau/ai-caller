import z from "zod";

export const CreateRoomParamsDto = z.object({
  companyId: z.uuidv7()
})

export type ICreateRoomParamsDto = z.infer<typeof CreateRoomParamsDto>;
