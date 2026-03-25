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
let availableVoices: { id: string; label: string; tone: string }[] = [];

beforeAll(async () => {
  const session = await createTestSession("ROOT");
  authCookie = session.cookie;
  authUserId = session.userId;

  // Fetch available voices from the active provider
  const res = await app.request("/api/v1/voice/voices", {
    headers: { Cookie: authCookie },
  });
  if (res.ok) {
    const data = (await res.json()) as {
      voices: { id: string; label: string; tone: string }[];
    };
    availableVoices = data.voices;
  }
});

afterAll(async () => {
  await cleanupTestSession(authUserId);
});

const authHeaders = () => ({ Cookie: authCookie });

describe("GET /api/v1/voice/voices", () => {
  it("should return available voices", async () => {
    const res = await app.request("/api/v1/voice/voices", {
      headers: authHeaders(),
    });

    expect(res.ok).toBe(true);
    const data = (await res.json()) as {
      voices: { id: string; label: string; tone: string }[];
    };
    expect(data.voices.length).toBeGreaterThan(0);
    expect(data.voices[0]?.id).toBeDefined();
    expect(data.voices[0]?.label).toBeDefined();
  });
});

describe("GET /api/v1/voice/preview", () => {
  it("should return 401 without auth", async () => {
    const voiceId = availableVoices[0]?.id ?? "alloy";
    const res = await app.request(`/api/v1/voice/preview?voice=${voiceId}`);
    expect(res.status).toBe(401);
  });

  it("should return audio/mpeg content type", async () => {
    const voiceId = availableVoices[0]?.id ?? "alloy";
    const res = await app.request(`/api/v1/voice/preview?voice=${voiceId}`, {
      headers: authHeaders(),
    });

    expect(res.ok).toBe(true);
    const contentType = res.headers.get("content-type") ?? "";
    expect(["audio/mpeg", "audio/wav"]).toContain(contentType);
  });

  it("should return cache-control header", async () => {
    const voiceId = availableVoices[0]?.id ?? "alloy";
    const res = await app.request(`/api/v1/voice/preview?voice=${voiceId}`, {
      headers: authHeaders(),
    });

    expect(res.ok).toBe(true);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("should return a non-empty body", async () => {
    const voiceId = availableVoices[0]?.id ?? "alloy";
    const res = await app.request(`/api/v1/voice/preview?voice=${voiceId}`, {
      headers: authHeaders(),
    });

    expect(res.ok).toBe(true);
    const blob = await res.blob();
    expect(blob.size).toBeGreaterThan(0);
  });
});
