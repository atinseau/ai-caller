import { CreateCompanyUseCase } from "@/application/create-company.use-case";
import { container } from "@/infrastructure/di/container";
import { Hono } from "hono";
import { CreateCompanyDto } from "../dtos/create-company.dto";
import { validator } from "hono/validator";

export const companyRouter = new Hono()

companyRouter.post('/', validator('json', (value) =>  CreateCompanyDto.parseAsync(value)), async (ctx) => {
  const createCompanyUseCase = container.get(CreateCompanyUseCase)
  const dto = ctx.req.valid('json')

  const companyId = await createCompanyUseCase.execute(dto)

  return ctx.json({
    message: 'Create a new company',
    companyId
  })
})
