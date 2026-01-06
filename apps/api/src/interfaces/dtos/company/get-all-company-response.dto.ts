import { z } from "@hono/zod-openapi";
import { CompanyModel } from "@/domain/models/company.model";

export const GetAllCompanyResponseDto = z.object({
  message: z.string().openapi({
    description: "Response message",
  }),
  companies: CompanyModel.array().openapi({
    description: "List of all companies",
  }),
});

export type IGetAllCompanyResponseDto = z.infer<
  typeof GetAllCompanyResponseDto
>;
