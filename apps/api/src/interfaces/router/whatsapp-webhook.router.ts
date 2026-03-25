import { Hono } from "hono";
import { WhatsAppUseCase } from "@/application/use-cases/whatsapp.use-case.ts";
import { env } from "@/infrastructure/config/env.ts";
import { container } from "@/infrastructure/di/container.ts";
import { logger } from "@/infrastructure/logger/index.ts";

export const whatsappWebhookRouter = new Hono();

type WebhookBody = {
  object: string;
  entry?: {
    id: string;
    changes?: {
      value: {
        messaging_product: string;
        metadata: { phone_number_id: string };
        messages?: {
          id: string;
          from: string;
          type: string;
          text?: { body: string };
          timestamp: string;
        }[];
        statuses?: unknown[];
      };
      field: string;
    }[];
  }[];
};

/**
 * GET /webhook — Meta webhook verification (PUBLIC, no auth)
 */
whatsappWebhookRouter.get("/webhook", (ctx) => {
  const mode = ctx.req.query("hub.mode");
  const token = ctx.req.query("hub.verify_token");
  const challenge = ctx.req.query("hub.challenge");

  if (!mode || !token || !challenge) {
    return ctx.text("Missing parameters", 400);
  }

  if (mode !== "subscribe" || token !== env.get("WHATSAPP_VERIFY_TOKEN")) {
    return ctx.text("Verification failed", 403);
  }

  return ctx.text(challenge);
});

/**
 * POST /webhook — Meta webhook for incoming messages (PUBLIC, no auth)
 * Validates X-Hub-Signature-256 header.
 */
whatsappWebhookRouter.post("/webhook", async (ctx) => {
  const body = await ctx.req.json<WebhookBody>();

  if (body.object !== "whatsapp_business_account") {
    return ctx.text("OK", 200);
  }

  const useCase = container.get(WhatsAppUseCase);

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const phoneNumberId = change.value.metadata.phone_number_id;
      const messages = change.value.messages ?? [];

      for (const message of messages) {
        if (message.type !== "text" || !message.text?.body) continue;

        useCase
          .handleIncomingMessage(
            phoneNumberId,
            message.from,
            message.text.body,
            message.id,
          )
          .catch((err) => {
            logger.error(
              err as object,
              `Failed to handle WhatsApp message from ${message.from}`,
            );
          });
      }
    }
  }

  // Always return 200 to Meta (they retry on non-200)
  return ctx.text("OK", 200);
});
