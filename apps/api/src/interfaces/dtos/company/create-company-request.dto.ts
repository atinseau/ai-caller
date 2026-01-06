import type { z } from "@hono/zod-openapi";
import { CompanyModel } from "@/domain/models/company.model";

export const CreateCompanyRequestDto = CompanyModel.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).openapi("CreateCompanyRequestDto", {
  description: "Data Transfer Object for creating a new company",
});

export type ICreateCompanyRequestDto = z.infer<typeof CreateCompanyRequestDto>;
