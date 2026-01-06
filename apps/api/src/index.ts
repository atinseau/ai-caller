import { websocket } from "hono/bun";
import { initializeOpenApi } from "./infrastructure/openapi";
import { app } from "./interfaces/application";

import "./infrastructure/cron";

const PORT = parseInt(Bun.env.PORT, 10);
if (Number.isNaN(PORT)) {
  throw new Error("PORT environment variable must be a valid number");
}

initializeOpenApi(app);

export default {
  port: PORT,
  websocket,
  fetch: app.fetch,
};
