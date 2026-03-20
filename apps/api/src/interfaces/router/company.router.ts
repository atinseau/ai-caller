import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { CompanyUseCase } from "@/application/use-cases/company.use-case.ts";
import { PhoneNumberUseCase } from "@/application/use-cases/phone-number.use-case.ts";
import { UserRole } from "@/generated/prisma/client";
import { container } from "@/infrastructure/di/container.ts";
import { CreateCompanyRequestDto } from "../dtos/company/create-company-request.dto.ts";
import { CreateCompanyResponseDto } from "../dtos/company/create-company-response.dto.ts";
import { GetAllCompanyResponseDto } from "../dtos/company/get-all-company-response.dto.ts";
import { GetCompanyResponseDto } from "../dtos/company/get-company-response.dto.ts";
import { UpdateCompanyRequestDto } from "../dtos/company/update-company-request.dto.ts";

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

  return ctx.json(
    {
      message: "Create a new company",
      companyId: company.id,
    },
    201,
  );
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

const getCompanyRoute = createRoute({
  method: "get",
  path: "/{id}",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Company found",
      content: {
        "application/json": {
          schema: GetCompanyResponseDto,
        },
      },
    },
    404: {
      description: "Company not found",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
  },
});

companyRouter.openapi(getCompanyRoute, async (ctx) => {
  const companyUseCase = container.get(CompanyUseCase);
  const { id } = ctx.req.valid("param");

  const company = await companyUseCase.getById(id);
  if (!company) {
    return ctx.json({ message: "Company not found" }, 404);
  }

  const phoneNumberUseCase = container.get(PhoneNumberUseCase);
  const [mcpStatus, phoneNumber] = await Promise.all([
    companyUseCase.checkMcpStatus(company.mcpUrl),
    phoneNumberUseCase.getByCompany(id),
  ]);
  const tools = await companyUseCase.listTools(company.mcpUrl, mcpStatus);

  return ctx.json({ company, mcpStatus, tools, phoneNumber }, 200);
});

const updateCompanyRoute = createRoute({
  method: "patch",
  path: "/{id}",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: UpdateCompanyRequestDto,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Company updated successfully",
      content: {
        "application/json": {
          schema: GetCompanyResponseDto,
        },
      },
    },
    400: {
      description: "Validation error",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
    404: {
      description: "Company not found",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
  },
});

companyRouter.openapi(updateCompanyRoute, async (ctx) => {
  const companyUseCase = container.get(CompanyUseCase);
  const { id } = ctx.req.valid("param");
  const dto = ctx.req.valid("json");

  const company = await companyUseCase.update(id, dto);
  const phoneNumberUseCase = container.get(PhoneNumberUseCase);
  const [mcpStatus, phoneNumber] = await Promise.all([
    companyUseCase.checkMcpStatus(company.mcpUrl),
    phoneNumberUseCase.getByCompany(id),
  ]);
  const tools = await companyUseCase.listTools(company.mcpUrl, mcpStatus);

  return ctx.json({ company, mcpStatus, tools, phoneNumber }, 200);
});

const deleteCompanyRoute = createRoute({
  method: "delete",
  path: "/{id}",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    204: {
      description: "Company deleted successfully",
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
    404: {
      description: "Company not found",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
  },
});

companyRouter.openapi(deleteCompanyRoute, async (ctx) => {
  // biome-ignore lint/suspicious/noExplicitAny: better-auth user injected by middleware
  const user = (ctx as any).get("user") as { role: string };
  if (user.role !== UserRole.ROOT) {
    return ctx.json({ message: "Forbidden" }, 403);
  }

  const companyUseCase = container.get(CompanyUseCase);
  const { id } = ctx.req.valid("param");

  const company = await companyUseCase.getById(id);
  if (!company) {
    return ctx.json({ message: "Company not found" }, 404);
  }

  await companyUseCase.delete(id);

  return new Response(null, { status: 204 });
});
