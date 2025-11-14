import z from "zod";

export const CreateCompanyDto = z.object({
  name: z.string(),
  mcpServerUrl: z.url(),
})

export type ICreateCompanyDto = z.infer<typeof CreateCompanyDto>;
