import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { app } from "@/interfaces/application.ts";
import {
  cleanupTestSession,
  createTestSession,
} from "@/tests/helpers/auth-session";

let rootCookie: string;
let rootUserId: string;
let userCookie: string;
let userUserId: string;

beforeAll(async () => {
  const root = await createTestSession("ROOT");
  rootCookie = root.cookie;
  rootUserId = root.userId;

  const user = await createTestSession("USER");
  userCookie = user.cookie;
  userUserId = user.userId;
});

afterAll(async () => {
  await cleanupTestSession(rootUserId);
  await cleanupTestSession(userUserId);
});

describe("GET /api/v1/user/me", () => {
  it("returns 401 without a session cookie", async () => {
    const res = await app.request("/api/v1/user/me");
    expect(res.status).toBe(401);
  });

  it("returns user profile for ROOT session", async () => {
    const res = await app.request("/api/v1/user/me", {
      headers: { Cookie: rootCookie },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      id: string;
      name: string;
      email: string;
      role: string;
      companyId: string | null;
    };

    expect(body.id).toBe(rootUserId);
    expect(body.role).toBe("ROOT");
    expect(body.companyId).toBeNull();
  });

  it("returns USER role for a USER session", async () => {
    const res = await app.request("/api/v1/user/me", {
      headers: { Cookie: userCookie },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { role: string };
    expect(body.role).toBe("USER");
  });

  it("returns all expected fields", async () => {
    const res = await app.request("/api/v1/user/me", {
      headers: { Cookie: rootCookie },
    });

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("name");
    expect(body).toHaveProperty("email");
    expect(body).toHaveProperty("role");
    expect(body).toHaveProperty("companyId");
  });
});
