import { z } from "@hono/zod-openapi";

export const GetCallParamsDto = z
  .object({
    callId: z.uuidv7().openapi({
      description: "The call identifier",
      example: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    }),
  })
  .openapi("GetCallParamsDto", {
    description: "Path params for fetching a call by id",
  });

export type IGetCallParamsDto = z.infer<typeof GetCallParamsDto>;
