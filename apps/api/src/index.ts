import { type BunWebSocketHandler, websocket } from "hono/bun";
import { initializeOpenApi } from "./infrastructure/openapi";
import { app } from "./interfaces/application";

import "./infrastructure/cron";
import type { Serve } from "bun";
import { env } from "./infrastructure/config/env";

initializeOpenApi(app);

export default {
  port: env.get("PORT"),
  fetch: app.fetch,
  websocket: websocket as BunWebSocketHandler<unknown>,
} satisfies Serve.Options<undefined>;
