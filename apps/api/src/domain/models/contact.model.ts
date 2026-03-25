import { z } from "@hono/zod-openapi";

export const ContactModel = z
  .object({
    id: z.uuidv7(),
    companyId: z.uuidv7(),
    phoneNumber: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    ipAddress: z.string().nullable().optional(),
    userAgent: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .openapi("ContactModel", {
    description: "Represents an end-user contact profile scoped to a company",
  });

export type IContactModel = z.infer<typeof ContactModel>;
