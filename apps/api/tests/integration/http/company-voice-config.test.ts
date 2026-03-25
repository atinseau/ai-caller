import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { CompanyUseCase } from "@/application/use-cases/company.use-case.ts";
import { container } from "@/infrastructure/di/container.ts";
import { app } from "@/interfaces/application.ts";
import {
  cleanupTestSession,
  createTestSession,
} from "@/tests/helpers/auth-session";

let authCookie: string;
let authUserId: string;
let testCompanyId: string;

beforeAll(async () => {
  const session = await createTestSession("ROOT");
  authCookie = session.cookie;
  authUserId = session.userId;

  const companyUseCase = container.get(CompanyUseCase);
  const company = await companyUseCase.create({
    name: `voice-cfg-test-${Date.now()}`,
  });
  testCompanyId = company.id;
});

afterAll(async () => {
  const { prisma } = await import("@/infrastructure/database/prisma.ts");
  await prisma.company.delete({ where: { id: testCompanyId } }).catch(() => {
    /* intentionally ignored */
  });
  await cleanupTestSession(authUserId);
});

const jsonAuthHeaders = () => ({
  "Content-Type": "application/json",
  Cookie: authCookie,
});
const authHeaders = () => ({ Cookie: authCookie });

describe("Company voice configuration", () => {
  it("should update voice field", async () => {
    const res = await app.request(`/api/v1/company/${testCompanyId}`, {
      method: "PATCH",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ voice: "cedar" }),
    });

    expect(res.ok).toBe(true);
    const data = (await res.json()) as {
      company: { voice: string | null };
    };
    expect(data.company.voice).toBe("cedar");
  });

  it("should update language field", async () => {
    const res = await app.request(`/api/v1/company/${testCompanyId}`, {
      method: "PATCH",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ language: "en" }),
    });

    expect(res.ok).toBe(true);
    const data = (await res.json()) as {
      company: { language: string | null };
    };
    expect(data.company.language).toBe("en");
  });

  it("should update voice and language together", async () => {
    const res = await app.request(`/api/v1/company/${testCompanyId}`, {
      method: "PATCH",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ voice: "marin", language: "fr" }),
    });

    expect(res.ok).toBe(true);
    const data = (await res.json()) as {
      company: { voice: string | null; language: string | null };
    };
    expect(data.company.voice).toBe("marin");
    expect(data.company.language).toBe("fr");
  });

  it("should set voice to null", async () => {
    const res = await app.request(`/api/v1/company/${testCompanyId}`, {
      method: "PATCH",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ voice: null }),
    });

    expect(res.ok).toBe(true);
    const data = (await res.json()) as {
      company: { voice: string | null };
    };
    expect(data.company.voice).toBeNull();
  });

  it("should accept any voice string (provider-specific)", async () => {
    const res = await app.request(`/api/v1/company/${testCompanyId}`, {
      method: "PATCH",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ voice: "eve" }),
    });

    expect(res.ok).toBe(true);
    const data = (await res.json()) as { company: { voice: string } };
    expect(data.company.voice).toBe("eve");
  });

  it("should reject invalid language value", async () => {
    const res = await app.request(`/api/v1/company/${testCompanyId}`, {
      method: "PATCH",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ language: "invalid" }),
    });

    expect(res.ok).toBe(false);
  });

  it("should persist voice config across reads", async () => {
    // Set values
    await app.request(`/api/v1/company/${testCompanyId}`, {
      method: "PATCH",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ voice: "sage", language: "de" }),
    });

    // Read back
    const res = await app.request(`/api/v1/company/${testCompanyId}`, {
      headers: authHeaders(),
    });

    expect(res.ok).toBe(true);
    const data = (await res.json()) as {
      company: { voice: string | null; language: string | null };
    };
    expect(data.company.voice).toBe("sage");
    expect(data.company.language).toBe("de");
  });
});
