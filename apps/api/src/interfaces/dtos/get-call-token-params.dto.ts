import z from "zod";

export const GetCallTokenParamsDto = z.object({
  companyId: z.uuidv7()
})
