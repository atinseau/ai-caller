import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { PhoneNumberUseCase } from "@/application/use-cases/phone-number.use-case.ts";
import { container } from "@/infrastructure/di/container.ts";

export const phoneNumberRouter = new OpenAPIHono();

const provisionRoute = createRoute({
  method: "post",
  path: "/{companyId}/phone-number",
  request: {
    params: z.object({ companyId: z.string() }),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            country: z.string().openapi({
              description: "ISO 3166-1 alpha-2 country code",
              example: "US",
            }),
            areaCode: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Phone number provisioned",
      content: {
        "application/json": {
          schema: z.object({
            phoneNumber: z.object({
              id: z.string(),
              phoneNumber: z.string(),
              companyId: z.string(),
            }),
          }),
        },
      },
    },
  },
});

phoneNumberRouter.openapi(provisionRoute, async (ctx) => {
  const useCase = container.get(PhoneNumberUseCase);
  const { companyId } = ctx.req.valid("param");
  const body = ctx.req.valid("json");
  const phoneNumber = await useCase.provision(
    companyId,
    body.country,
    body.areaCode,
  );
  return ctx.json({ phoneNumber }, 200);
});

const releaseRoute = createRoute({
  method: "delete",
  path: "/{companyId}/phone-number",
  request: {
    params: z.object({ companyId: z.string() }),
  },
  responses: {
    200: {
      description: "Phone number released",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
  },
});

phoneNumberRouter.openapi(releaseRoute, async (ctx) => {
  const useCase = container.get(PhoneNumberUseCase);
  const { companyId } = ctx.req.valid("param");
  await useCase.release(companyId);
  return ctx.json({ message: "Phone number released" }, 200);
});

const getRoute = createRoute({
  method: "get",
  path: "/{companyId}/phone-number",
  request: {
    params: z.object({ companyId: z.string() }),
  },
  responses: {
    200: {
      description: "Phone number for this company",
      content: {
        "application/json": {
          schema: z.object({
            phoneNumber: z
              .object({
                id: z.string(),
                phoneNumber: z.string(),
                companyId: z.string(),
              })
              .nullable(),
          }),
        },
      },
    },
  },
});

phoneNumberRouter.openapi(getRoute, async (ctx) => {
  const useCase = container.get(PhoneNumberUseCase);
  const { companyId } = ctx.req.valid("param");
  const phoneNumber = await useCase.getByCompany(companyId);
  return ctx.json({ phoneNumber }, 200);
});
