import { Hono } from "hono";

export const userRouter = new Hono();

// GET /api/v1/user/me — returns the currently authenticated user with role
// auth middleware (applied globally on /api/v1/*) sets ctx.var.user via better-auth
userRouter.get("/me", (ctx) => {
  // biome-ignore lint/suspicious/noExplicitAny: better-auth user injected by middleware
  const user = (ctx as any).get("user") as {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role?: string;
    companyId?: string | null;
  };

  return ctx.json({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    role: (user.role as "ROOT" | "USER") ?? "USER",
    companyId: user.companyId ?? null,
  });
});
