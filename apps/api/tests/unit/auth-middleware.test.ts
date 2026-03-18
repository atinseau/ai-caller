import { describe, expect, it, mock, spyOn, afterEach } from "bun:test";
import { Hono } from "hono";
import { authMiddleware } from "@/infrastructure/middleware/auth.middleware";
import * as authModule from "@/infrastructure/auth";

/**
 * Unit tests for authMiddleware.
 * We spy on auth.api.getSession to control what it returns.
 *
 * IMPORTANT: mock.restore() is called in afterEach (not beforeEach) to ensure
 * the spy is always restored after every test, including the last one.
 * If the spy leaked to other test files, requests without cookies would pass auth.
 */

function makeApp() {
  const app = new Hono();
  app.use("*", authMiddleware);
  app.get("/test", (ctx) => {
    // biome-ignore lint/suspicious/noExplicitAny: test access to context vars
    const user = (ctx as any).get("user");
    return ctx.json({ userId: user?.id ?? null });
  });
  return app;
}

describe("authMiddleware", () => {
  afterEach(() => {
    // Restore after every test to prevent spy leakage to other test files
    mock.restore();
  });

  it("returns 401 when session is null", async () => {
    spyOn(authModule.auth.api, "getSession").mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request("/test");

    expect(res.status).toBe(401);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Unauthorized");
  });

  it("calls next() and returns 200 when session is valid", async () => {
    const fakeUser = { id: "user-1", name: "Test User", email: "test@test.com", role: "ROOT" };
    const fakeSession = { id: "session-1", userId: "user-1" };

    spyOn(authModule.auth.api, "getSession").mockResolvedValue({
      user: fakeUser,
      session: fakeSession,
    } as never);

    const app = makeApp();
    const res = await app.request("/test");

    expect(res.status).toBe(200);
    const body = (await res.json()) as { userId: string };
    expect(body.userId).toBe("user-1");
  });

  it("sets user on context so downstream handlers can read it", async () => {
    const fakeUser = { id: "user-abc", name: "Arthur", email: "arthur@test.com", role: "ROOT" };

    spyOn(authModule.auth.api, "getSession").mockResolvedValue({
      user: fakeUser,
      session: { id: "s1", userId: "user-abc" },
    } as never);

    const app = new Hono();
    app.use("*", authMiddleware);
    app.get("/profile", (ctx) => {
      // biome-ignore lint/suspicious/noExplicitAny: test access to context vars
      const user = (ctx as any).get("user") as typeof fakeUser;
      return ctx.json({ role: user.role, email: user.email });
    });

    const res = await app.request("/profile");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { role: string; email: string };
    expect(body.role).toBe("ROOT");
    expect(body.email).toBe("arthur@test.com");
  });
});
