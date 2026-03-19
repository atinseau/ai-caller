import { z } from "@hono/zod-openapi";
import { CompanyModel } from "@/domain/models/company.model.ts";

export const GetCompanyResponseDto = z
  .object({
    company: CompanyModel,
  })
  .openapi("GetCompanyResponseDto", {
    description: "Response DTO for getting a single company",
  });

export type IGetCompanyResponseDto = z.infer<typeof GetCompanyResponseDto>;
