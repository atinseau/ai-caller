import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { CompanyUseCase } from "@/application/use-cases/company.use-case";
import { requireSession } from "@/infrastructure/auth/session";
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

  const session = await requireSession(ctx);
  if (session instanceof Response) return session;

  const userId = session.user?.id;
  if (!userId) {
    return ctx.json({ message: "Unauthorized" }, 401);
  }

  const company = await companyUseCase.createWithOwner(dto, userId);

  return ctx.json({
    message: "Create a new company",
    companyId: company.id,
  });
});

const getMyCompaniesRoute = createRoute({
  method: "get",
  path: "/me",
  responses: {
    200: {
      description: "List of companies for the current user",
      content: {
        "application/json": {
          schema: GetAllCompanyResponseDto,
        },
      },
    },
  },
});

companyRouter.openapi(getMyCompaniesRoute, async (ctx) => {
  const session = await requireSession(ctx);
  if (session instanceof Response) return session;

  const userId = session.user?.id;
  if (!userId) {
    return ctx.json({ message: "Unauthorized" }, 401);
  }

  const companyUseCase = container.get(CompanyUseCase);
  return ctx.json({
    message: "Get current user companies",
    companies: await companyUseCase.listByUser(userId),
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
  const session = await requireSession(ctx);
  if (session instanceof Response) return session;

  const userId = session.user?.id;
  if (!userId) {
    return ctx.json({ message: "Unauthorized" }, 401);
  }

  const companyUseCase = container.get(CompanyUseCase);
  return ctx.json({
    message: "Get all companies",
    companies: await companyUseCase.listByUser(userId),
  });
});
