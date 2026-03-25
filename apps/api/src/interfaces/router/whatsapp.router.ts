import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { WhatsAppUseCase } from "@/application/use-cases/whatsapp.use-case.ts";
import { WhatsAppConfigModel } from "@/domain/models/whatsapp-config.model.ts";
import { container } from "@/infrastructure/di/container.ts";

export const whatsappRouter = new OpenAPIHono();

const CompanyIdParam = z.object({
  companyId: z
    .string()
    .openapi({ description: "Company ID", param: { in: "path" } }),
});

// ─── GET /{companyId}/whatsapp ──────────────────────────────────────────────

const getConfigRoute = createRoute({
  method: "get",
  path: "/{companyId}/whatsapp",
  request: {
    params: CompanyIdParam,
  },
  responses: {
    200: {
      description: "WhatsApp config for the company",
      content: {
        "application/json": {
          schema: z.object({
            config: WhatsAppConfigModel.nullable(),
          }),
        },
      },
    },
  },
});

whatsappRouter.openapi(getConfigRoute, async (ctx) => {
  const { companyId } = ctx.req.valid("param");
  const useCase = container.get(WhatsAppUseCase);
  const config = await useCase.getConfig(companyId);
  return ctx.json({ config });
});

// ─── POST /{companyId}/whatsapp ─────────────────────────────────────────────

const CreateWhatsAppConfigDto = z.object({
  phoneNumberId: z.string().openapi({
    description: "Meta WhatsApp Business phone number ID",
  }),
});

const createConfigRoute = createRoute({
  method: "post",
  path: "/{companyId}/whatsapp",
  request: {
    params: CompanyIdParam,
    body: {
      required: true,
      content: {
        "application/json": { schema: CreateWhatsAppConfigDto },
      },
    },
  },
  responses: {
    201: {
      description: "WhatsApp config created",
      content: {
        "application/json": {
          schema: z.object({ config: WhatsAppConfigModel }),
        },
      },
    },
  },
});

whatsappRouter.openapi(createConfigRoute, async (ctx) => {
  const { companyId } = ctx.req.valid("param");
  const body = ctx.req.valid("json");
  const useCase = container.get(WhatsAppUseCase);

  const config = await useCase.configure(companyId, body.phoneNumberId);

  return ctx.json({ config }, 201);
});

// ─── PATCH /{companyId}/whatsapp ────────────────────────────────────────────

const UpdateWhatsAppConfigDto = z.object({
  phoneNumberId: z.string().optional().openapi({
    description: "Meta WhatsApp Business phone number ID",
  }),
  active: z.boolean().optional().openapi({
    description: "Whether WhatsApp is active",
  }),
});

const updateConfigRoute = createRoute({
  method: "patch",
  path: "/{companyId}/whatsapp",
  request: {
    params: CompanyIdParam,
    body: {
      required: true,
      content: {
        "application/json": { schema: UpdateWhatsAppConfigDto },
      },
    },
  },
  responses: {
    200: {
      description: "WhatsApp config updated",
      content: {
        "application/json": {
          schema: z.object({ config: WhatsAppConfigModel }),
        },
      },
    },
  },
});

whatsappRouter.openapi(updateConfigRoute, async (ctx) => {
  const { companyId } = ctx.req.valid("param");
  const body = ctx.req.valid("json");
  const useCase = container.get(WhatsAppUseCase);

  const config = await useCase.updateConfig(companyId, body);
  return ctx.json({ config });
});

// ─── DELETE /{companyId}/whatsapp ───────────────────────────────────────────

const deleteConfigRoute = createRoute({
  method: "delete",
  path: "/{companyId}/whatsapp",
  request: {
    params: CompanyIdParam,
  },
  responses: {
    200: {
      description: "WhatsApp config deleted",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
  },
});

whatsappRouter.openapi(deleteConfigRoute, async (ctx) => {
  const { companyId } = ctx.req.valid("param");
  const useCase = container.get(WhatsAppUseCase);
  await useCase.deleteConfig(companyId);
  return ctx.json({ message: "WhatsApp config deleted" });
});

// ─── POST /{companyId}/whatsapp/start ───────────────────────────────────────

const StartConversationDto = z.object({
  toNumber: z.string().openapi({
    description: "WhatsApp phone number to contact (E.164 format)",
    example: "+33612345678",
  }),
  initialMessage: z.string().optional().openapi({
    description: "Optional initial message to trigger the AI agent",
  }),
});

const startConversationRoute = createRoute({
  method: "post",
  path: "/{companyId}/whatsapp/start",
  request: {
    params: CompanyIdParam,
    body: {
      required: true,
      content: {
        "application/json": { schema: StartConversationDto },
      },
    },
  },
  responses: {
    200: {
      description: "Conversation started",
      content: {
        "application/json": {
          schema: z.object({
            roomId: z.string(),
            message: z.string(),
          }),
        },
      },
    },
  },
});

whatsappRouter.openapi(startConversationRoute, async (ctx) => {
  const { companyId } = ctx.req.valid("param");
  const { toNumber, initialMessage } = ctx.req.valid("json");
  const useCase = container.get(WhatsAppUseCase);

  const roomId = await useCase.startConversation(
    companyId,
    toNumber,
    initialMessage,
  );

  return ctx.json({ roomId, message: "Conversation started" });
});
