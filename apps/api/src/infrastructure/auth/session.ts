import type { MiddlewareHandler } from "hono";
import { auth } from "./index";

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

declare module "hono" {
  interface ContextVariableMap {
    session: AuthSession | null;
  }
}

export const sessionMiddleware: MiddlewareHandler = async (ctx, next) => {
  const session = await auth.api.getSession({
    headers: ctx.req.raw.headers,
  });

  ctx.set("session", session ?? null);
  await next();
};

export async function getSessionFromRequest(
  ctx: Parameters<MiddlewareHandler>[0],
) {
  return auth.api.getSession({
    headers: ctx.req.raw.headers,
  });
}

export async function requireSession(ctx: Parameters<MiddlewareHandler>[0]) {
  const session =
    ctx.get("session") ??
    (await auth.api.getSession({
      headers: ctx.req.raw.headers,
    }));

  if (!session) {
    return ctx.json({ message: "Unauthorized" }, 401);
  }

  return session;
}
