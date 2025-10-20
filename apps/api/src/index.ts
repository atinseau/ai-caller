import { app } from "./interfaces/application";
import { websocket } from "hono/bun";

const PORT = parseInt(Bun.env.PORT)
if (isNaN(PORT)) {
  throw new Error("PORT environment variable must be a valid number")
}

export default {
  port: PORT,
  websocket,
  fetch: app.fetch
}
