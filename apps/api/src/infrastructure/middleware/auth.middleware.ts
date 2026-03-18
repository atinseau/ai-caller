import type { MiddlewareHandler } from "hono";
import { auth } from "../auth";

export const authMiddleware: MiddlewareHandler = async (ctx, next) => {
  const session = await auth.api.getSession({ headers: ctx.req.raw.headers });

  if (!session) {
    return ctx.json({ message: "Unauthorized" }, 401);
  }

  ctx.set("user", session.user);
  ctx.set("session", session.session);

  await next();
};
