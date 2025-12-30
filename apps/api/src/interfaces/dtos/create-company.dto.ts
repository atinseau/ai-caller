import z from "zod";

export const CreateCompanyDto = z.object({
  name: z.string(),
  mcpUrl: z.url(),
  mcpTestUrl: z.url().optional(),
})

export type ICreateCompanyDto = z.infer<typeof CreateCompanyDto>;
