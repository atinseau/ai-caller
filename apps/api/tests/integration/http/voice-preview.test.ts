import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  setDefaultTimeout,
} from "bun:test";
import { app } from "@/interfaces/application.ts";
import {
  cleanupTestSession,
  createTestSession,
} from "@/tests/helpers/auth-session";

setDefaultTimeout(30_000);

let authCookie: string;
let authUserId: string;

beforeAll(async () => {
  const session = await createTestSession("ROOT");
  authCookie = session.cookie;
  authUserId = session.userId;
});

afterAll(async () => {
  await cleanupTestSession(authUserId);
});

const authHeaders = () => ({ Cookie: authCookie });

describe("GET /api/v1/voice/preview", () => {
  it("should return 401 without auth", async () => {
    const res = await app.request("/api/v1/voice/preview?voice=marin");
    expect(res.status).toBe(401);
  });

  it("should return audio/mpeg content type", async () => {
    const res = await app.request("/api/v1/voice/preview?voice=alloy", {
      headers: authHeaders(),
    });

    expect(res.ok).toBe(true);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
  });

  it("should return cache-control header", async () => {
    const res = await app.request("/api/v1/voice/preview?voice=alloy", {
      headers: authHeaders(),
    });

    expect(res.ok).toBe(true);
    expect(res.headers.get("cache-control")).toBe("public, max-age=86400");
  });

  it("should work with coral voice", async () => {
    const res = await app.request("/api/v1/voice/preview?voice=coral", {
      headers: authHeaders(),
    });

    expect(res.ok).toBe(true);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
  });

  it("should return a non-empty body", async () => {
    const res = await app.request("/api/v1/voice/preview?voice=echo", {
      headers: authHeaders(),
    });

    expect(res.ok).toBe(true);
    const blob = await res.blob();
    expect(blob.size).toBeGreaterThan(0);
  });
});
