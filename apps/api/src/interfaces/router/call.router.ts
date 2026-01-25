import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { CallUseCase } from "@/application/use-cases/call.use-case";
import { CompanyUseCase } from "@/application/use-cases/company.use-case";
import { requireSession } from "@/infrastructure/auth/session";
import { container } from "@/infrastructure/di/container";
import { GetCallParamsDto } from "../dtos/call/get-call-params.dto";
import {
  GetCallListResponseDto,
  GetCallResponseDto,
} from "../dtos/call/get-call-response.dto";

export const callRouter = new OpenAPIHono();

const companyCallsParams = z
  .object({
    companyId: z.uuidv7().openapi({
      description: "Company identifier",
      example: "3fa85f64-5717-4562-b3fc-2c963f66afa7",
    }),
  })
  .openapi("CompanyCallsParams");

const listCompanyCallsRoute = createRoute({
  method: "get",
  path: "/company/{companyId}",
  request: {
    params: companyCallsParams,
  },
  responses: {
    200: {
      description: "List of calls for a company",
      content: {
        "application/json": {
          schema: GetCallListResponseDto,
        },
      },
    },
    401: {
      description: "Unauthorized",
    },
    403: {
      description: "Forbidden",
    },
  },
});

callRouter.openapi(listCompanyCallsRoute, async (ctx) => {
  const session = await requireSession(ctx);
  if (session instanceof Response) return session;

  const { companyId } = ctx.req.valid("param");
  const userId = session.user?.id;
  if (!userId) return ctx.json({ message: "Unauthorized" }, 401);

  const companyUseCase = container.get(CompanyUseCase);
  const companies = await companyUseCase.listByUser(userId);
  const hasAccess = companies.some((company) => company?.id === companyId);

  if (!hasAccess) {
    return ctx.json({ message: "Forbidden" }, 403);
  }

  const callUseCase = container.get(CallUseCase);
  const calls = await callUseCase.listByCompany(companyId);

  return ctx.json({
    message: "Calls fetched successfully",
    calls,
  });
});

const getCallRoute = createRoute({
  method: "get",
  path: "/{callId}",
  request: {
    params: GetCallParamsDto,
  },
  responses: {
    200: {
      description: "Call fetched successfully",
      content: {
        "application/json": {
          schema: GetCallResponseDto,
        },
      },
    },
    401: {
      description: "Unauthorized",
    },
    403: {
      description: "Forbidden",
    },
  },
});

callRouter.openapi(getCallRoute, async (ctx) => {
  const session = await requireSession(ctx);
  if (session instanceof Response) return session;

  const { callId } = ctx.req.valid("param");
  const userId = session.user?.id;
  if (!userId) return ctx.json({ message: "Unauthorized" }, 401);

  const callUseCase = container.get(CallUseCase);
  const call = await callUseCase.getById(callId);

  const companyUseCase = container.get(CompanyUseCase);
  const companies = await companyUseCase.listByUser(userId);
  const hasAccess = companies.some((company) => company?.id === call.companyId);

  if (!hasAccess) {
    return ctx.json({ message: "Forbidden" }, 403);
  }

  return ctx.json({
    message: "Call fetched successfully",
    call,
  });
});
