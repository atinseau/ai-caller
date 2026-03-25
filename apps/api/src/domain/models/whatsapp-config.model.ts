import { z } from "@hono/zod-openapi";

export const WhatsAppConfigModel = z
  .object({
    id: z.uuidv7().openapi({
      description: "The unique identifier of the WhatsApp config",
    }),
    phoneNumberId: z.string().openapi({
      description: "Meta WhatsApp Business phone number ID",
    }),
    active: z.boolean().openapi({
      description: "Whether this WhatsApp config is active",
    }),
    companyId: z.uuidv7().openapi({
      description: "The company this config belongs to",
    }),
    createdAt: z.date().openapi({
      description: "The creation timestamp",
    }),
    updatedAt: z.date().openapi({
      description: "The last update timestamp",
    }),
  })
  .openapi("WhatsAppConfigModel", {
    description: "Represents a WhatsApp Business configuration for a company",
  });

export type IWhatsAppConfigModel = z.infer<typeof WhatsAppConfigModel>;
