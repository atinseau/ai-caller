import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { auth } from "@/infrastructure/auth";
import { sessionMiddleware } from "@/infrastructure/auth/session";
import { env } from "@/infrastructure/config/env";
import { globalErrorHandler } from "@/infrastructure/error/global-error-handler";
import { loggerMiddleware } from "@/infrastructure/middleware/logger.middleware";
import { callRouter } from "./router/call.router";
import { companyRouter } from "./router/company.router";
import { roomRouter } from "./router/room.router";

const app = new OpenAPIHono();

app.use(
  "*",
  cors({
    origin: env.get("CLIENT_URL"),
    credentials: true,
  }),
);

app.use("*", sessionMiddleware);
app.use("*", loggerMiddleware);

// app.route('/openai', openAiRouter)
app.route("/api/v1/room", roomRouter);
app.route("/api/v1/company", companyRouter);
app.route("/api/v1/call", callRouter);

app.get("/", (c) => c.json({ message: "API is running", docs: "/docs" }));

// Auth routes
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.notFound((ctx) => ctx.json({ message: "Not Found" }, 404));
app.onError(globalErrorHandler);

export { app };
