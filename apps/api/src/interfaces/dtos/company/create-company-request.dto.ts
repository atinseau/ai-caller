import { z } from "@hono/zod-openapi";

export const CreateCompanyRequestDto = z
  .object({
    name: z.string().openapi({
      description: "The name of the company",
      example: "Acme Corp",
    }),
    description: z.string().optional().openapi({
      description: "A short description of the company",
      example: "Leading provider of innovative solutions",
    }),
  })
  .openapi("CreateCompanyRequestDto", {
    description: "Data Transfer Object for creating a new company",
  });

export type ICreateCompanyRequestDto = z.infer<typeof CreateCompanyRequestDto>;
