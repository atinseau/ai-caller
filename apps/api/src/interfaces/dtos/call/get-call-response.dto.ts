import { z } from "@hono/zod-openapi";
import { CallModel } from "@/domain/models/call.model";

export const GetCallResponseDto = z
  .object({
    message: z.string().openapi({
      description: "Response message",
      example: "Call fetched successfully",
    }),
    call: CallModel.openapi({
      description: "Call details",
    }),
  })
  .openapi("GetCallResponseDto", {
    description: "Response DTO for fetching a call by id",
  });

export const GetCallListResponseDto = z
  .object({
    message: z.string().openapi({
      description: "Response message",
      example: "Calls fetched successfully",
    }),
    calls: CallModel.array().openapi({
      description: "List of calls for a company",
    }),
  })
  .openapi("GetCallListResponseDto", {
    description: "Response DTO for listing calls by company",
  });

export type IGetCallResponseDto = z.infer<typeof GetCallResponseDto>;
export type IGetCallListResponseDto = z.infer<typeof GetCallListResponseDto>;
