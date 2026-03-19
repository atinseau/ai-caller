import type { Serve } from "bun";
import { type BunWebSocketHandler, websocket } from "hono/bun";
import { env } from "./infrastructure/config/env.ts";

// Initialize secrets from Infisical (or fallback to process.env)
await env.init();

// Import app and cron after env is initialized
const { app } = await import("./interfaces/application.ts");
const { initializeOpenApi } = await import("./infrastructure/openapi/index.ts");
await import("./infrastructure/cron/index.ts");

initializeOpenApi(app);

export default {
  port: env.get("PORT"),
  fetch: app.fetch,
  websocket: websocket as BunWebSocketHandler<unknown>,
} satisfies Serve.Options<undefined>;
