import { Hono } from "hono";
import { validator } from "hono/validator";
import { CompanyUseCase } from "@/application/use-cases/company.use-case";
import { container } from "@/infrastructure/di/container";
import { CreateCompanyDto } from "../dtos/create-company.dto";

export const companyRouter = new Hono();

companyRouter.post(
  "/",
  validator("json", (value) => CreateCompanyDto.parseAsync(value)),
  async (ctx) => {
    const companyUseCase = container.get(CompanyUseCase);
    const dto = ctx.req.valid("json");

    const companyId = await companyUseCase.create(dto);

    return ctx.json({
      message: "Create a new company",
      companyId,
    });
  },
);

companyRouter.get("/all", async (ctx) => {
  const companyUseCase = container.get(CompanyUseCase);
  return ctx.json({
    message: "Get all companies",
    companies: await companyUseCase.list(),
  });
});
