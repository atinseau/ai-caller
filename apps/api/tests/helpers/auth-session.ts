import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { setSignedCookie } from "hono/cookie";
import { prisma } from "@/infrastructure/database/prisma";

// better-auth uses DEFAULT_SECRET when no BETTER_AUTH_SECRET env var is set
const AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET ?? "better-auth-secret-12345678901234567890";

/**
 * Creates a real user + session in the DB and returns a properly signed
 * `better-auth.session_token` cookie string.
 *
 * better-auth uses hono-compatible signed cookies (value.HMAC-SHA256).
 * This helper signs the token the same way so `auth.api.getSession()`
 * can validate and resolve the session.
 *
 * @example
 * const { cookie, userId } = await createTestSession("ROOT");
 * const res = await app.request("/api/v1/user/me", { headers: { Cookie: cookie } });
 * await cleanupTestSession(userId);
 */
export async function createTestSession(
  role: "ROOT" | "USER" = "ROOT",
): Promise<{ cookie: string; userId: string; sessionToken: string }> {
  const userId = randomUUID();
  const sessionId = randomUUID();
  const sessionToken = randomUUID();
  const now = new Date();

  await prisma.user.create({
    data: {
      id: userId,
      name: `test-user-${userId.slice(0, 8)}`,
      email: `test-${userId.slice(0, 8)}@test.local`,
      emailVerified: true,
      role: role as never,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.session.create({
    data: {
      id: sessionId,
      token: sessionToken,
      userId,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour
      createdAt: now,
      updatedAt: now,
    },
  });

  const cookie = await buildSignedCookie(sessionToken);

  return { cookie, userId, sessionToken };
}

export async function cleanupTestSession(userId: string): Promise<void> {
  // Cascade deletes session rows too (onDelete: Cascade on Session → User)
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

/**
 * Signs a session token using hono's signed cookie mechanism —
 * the same format better-call uses for `getSignedCookie`.
 * Returns a Cookie header string: `better-auth.session_token=<signedValue>`
 */
async function buildSignedCookie(token: string): Promise<string> {
  const app = new Hono();
  let cookieValue = "";

  app.get("/", async (c) => {
    await setSignedCookie(c, "better-auth.session_token", token, AUTH_SECRET);
    return c.text("ok");
  });

  const res = await app.request("/");
  const setCookieHeader = res.headers.get("set-cookie") ?? "";
  // Extract `name=value` part before the first `;`
  cookieValue = setCookieHeader.split(";")[0] ?? "";
  return cookieValue;
}
