import { type BunWebSocketHandler, websocket } from "hono/bun";
import { initializeOpenApi } from "./infrastructure/openapi";
import { app } from "./interfaces/application";

import "./infrastructure/cron";
import type { Serve } from "bun";

const PORT = parseInt(Bun.env.PORT, 10);
if (Number.isNaN(PORT)) {
  throw new Error("PORT environment variable must be a valid number");
}

initializeOpenApi(app);

export default {
  port: PORT,
  fetch: app.fetch,
  websocket: websocket as BunWebSocketHandler<unknown>,
} satisfies Serve.Options<undefined>;
