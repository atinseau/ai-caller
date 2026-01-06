import { z } from "@hono/zod-openapi";

export const CreateCompanyResponseDto = z
  .object({
    message: z.string().openapi({
      description: "Response message",
      example: "Create a new company",
    }),
    companyId: z.string().openapi({
      description: "The ID of the newly created company",
      example: "company_123456",
    }),
  })
  .openapi("CreateCompanyResponseDto", {
    description: "Response DTO for creating a new company",
  });

export type ICreateCompanyResponseDto = z.infer<
  typeof CreateCompanyResponseDto
>;
