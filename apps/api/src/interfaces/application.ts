import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { auth } from "@/infrastructure/auth/index.ts";
import { env } from "@/infrastructure/config/env.ts";
import { globalErrorHandler } from "@/infrastructure/error/global-error-handler.ts";
import { authMiddleware } from "@/infrastructure/middleware/auth.middleware.ts";
import { loggerMiddleware } from "@/infrastructure/middleware/logger.middleware.ts";
import { companyRouter } from "./router/company.router.ts";
import { messageRouter } from "./router/message.router.ts";
import { phoneNumberRouter } from "./router/phone-number.router.ts";
import { roomRouter } from "./router/room.router.ts";
import { telephonyRouter } from "./router/telephony.router.ts";
import { userRouter } from "./router/user.router.ts";
import { voiceRouter } from "./router/voice.router.ts";

const app = new OpenAPIHono();

app.use(
  "*",
  cors({
    origin: env.get("CLIENT_URL"),
    credentials: true,
  }),
);

app.use("*", loggerMiddleware);

// Auth routes (public — better-auth handles its own auth)
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Telephony routes (public — Twilio webhooks cannot authenticate with session cookies)
app.route("/api/telephony", telephonyRouter);

// Protected API routes
app.use("/api/v1/*", authMiddleware);

app.route("/api/v1/user", userRouter);
app.route("/api/v1/room", roomRouter);
app.route("/api/v1/room", messageRouter);
app.route("/api/v1/company", companyRouter);
app.route("/api/v1/company", phoneNumberRouter);
app.route("/api/v1/voice", voiceRouter);

app.get("/", (c) => c.json({ message: "API is running", docs: "/docs" }));

app.notFound((ctx) => ctx.json({ message: "Not Found" }, 404));
app.onError(globalErrorHandler);

export { app };
