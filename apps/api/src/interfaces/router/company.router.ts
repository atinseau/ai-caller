import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { CompanyUseCase } from "@/application/use-cases/company.use-case";
import { container } from "@/infrastructure/di/container";
import { CreateCompanyRequestDto } from "../dtos/company/create-company-request.dto";
import { CreateCompanyResponseDto } from "../dtos/company/create-company-response.dto";
import { GetAllCompanyResponseDto } from "../dtos/company/get-all-company-response.dto";

export const companyRouter = new OpenAPIHono();

const createCompanyRoute = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: CreateCompanyRequestDto,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Company created successfully",
      content: {
        "application/json": {
          schema: CreateCompanyResponseDto,
        },
      },
    },
  },
});

companyRouter.openapi(createCompanyRoute, async (ctx) => {
  const companyUseCase = container.get(CompanyUseCase);
  const dto = ctx.req.valid("json");

  const company = await companyUseCase.create(dto);

  return ctx.json({
    message: "Create a new company",
    companyId: company.id,
  });
});

const getAllCompaniesRoute = createRoute({
  method: "get",
  path: "/all",
  responses: {
    200: {
      description: "List of all companies",
      content: {
        "application/json": {
          schema: GetAllCompanyResponseDto,
        },
      },
    },
  },
});

companyRouter.openapi(getAllCompaniesRoute, async (ctx) => {
  const companyUseCase = container.get(CompanyUseCase);
  return ctx.json({
    message: "Get all companies",
    companies: await companyUseCase.list(),
  });
});
