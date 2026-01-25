import { z } from "@hono/zod-openapi";
import { CompanyModel } from "@/domain/models/company.model";

export const GetCompanyResponseDto = z
  .object({
    message: z.string().openapi({
      description: "Response message",
      example: "Company fetched successfully",
    }),
    company: CompanyModel.openapi({
      description: "Company details",
    }),
  })
  .openapi("GetCompanyResponseDto", {
    description: "Response DTO for fetching a company by id",
  });

export type IGetCompanyResponseDto = z.infer<typeof GetCompanyResponseDto>;
