import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "@/infrastructure/auth";
import { globalErrorHandler } from "@/infrastructure/error/global-error-handler";
import { loggerMiddleware } from "@/infrastructure/middleware/logger.middleware";
import { companyRouter } from "./router/company.router";
import {
  roomRouter,
  // openAiRouter
} from "./router/room.router";
import { toolRouter } from "./router/tool.router";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: Bun.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use("*", loggerMiddleware);

// app.route('/openai', openAiRouter)
app.route("/api/v1/room", roomRouter);
app.route("/api/v1/company", companyRouter);
app.route("/api/v1/tool", toolRouter);

app.get("/", (c) => c.json({ message: "API is running", docs: "/scalar" }));

app.get(
  "/scalar",
  Scalar({
    url: "/doc",
  }),
);

// Auth routes
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.notFound((ctx) => ctx.json({ message: "Not Found" }, 404));
app.onError(globalErrorHandler);

export { app };
