import { z } from "@hono/zod-openapi";

export const PhoneNumberModel = z
  .object({
    id: z.uuidv7().openapi({
      description: "The unique identifier of the phone number",
    }),
    phoneNumber: z.string().openapi({
      description: "The phone number in E.164 format",
      example: "+33612345678",
    }),
    twilioSid: z.string().openapi({
      description: "The Twilio phone number SID",
    }),
    companyId: z.uuidv7().openapi({
      description: "The company this phone number is assigned to",
    }),
    createdAt: z.date().openapi({
      description: "The creation timestamp",
    }),
    updatedAt: z.date().openapi({
      description: "The last update timestamp",
    }),
  })
  .openapi("PhoneNumberModel", {
    description: "Represents a phone number assigned to a company",
  });

export type IPhoneNumberModel = z.infer<typeof PhoneNumberModel>;
