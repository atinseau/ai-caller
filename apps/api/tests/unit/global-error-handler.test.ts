import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { globalErrorHandler } from "@/infrastructure/error/global-error-handler";

/**
 * Unit tests for globalErrorHandler.
 * We mount a minimal Hono app that throws specific errors in a route,
 * then verify the handler returns the correct status/body.
 */

function makeApp(throwFn: () => unknown) {
  const app = new Hono();
  app.get("/boom", () => {
    throw throwFn();
  });
  app.onError(globalErrorHandler);
  return app;
}

describe("globalErrorHandler", () => {
  it("returns 500 with error message for generic Error", async () => {
    const app = makeApp(() => new Error("Something blew up"));
    const res = await app.request("/boom");

    expect(res.status).toBe(500);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Something blew up");
  });

  it("returns 400 with ZodError tree for ZodError", async () => {
    const app = makeApp(() => {
      const schema = z.object({ name: z.string() });
      try {
        schema.parse({ name: 42 });
      } catch (e) {
        return e;
      }
    });

    const res = await app.request("/boom");
    expect(res.status).toBe(400);

    const body = await res.json();
    // z.treeifyError produces an object with nested error structure
    expect(body).toBeDefined();
    expect(typeof body).toBe("object");
  });

  it("returns HTTPException status and response", async () => {
    const app = makeApp(() => new HTTPException(403, { message: "Forbidden" }));
    const res = await app.request("/boom");

    expect(res.status).toBe(403);
  });

  it("returns 409 for Prisma P2002 unique constraint error", async () => {
    const { PrismaClientKnownRequestError } = await import(
      "@/generated/prisma/internal/prismaNamespace"
    );

    const app = makeApp(
      () =>
        new PrismaClientKnownRequestError("Unique constraint", {
          code: "P2002",
          clientVersion: "5.0.0",
          meta: { target: ["email"] },
        }),
    );

    const res = await app.request("/boom");
    expect(res.status).toBe(409);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Unique constraint failed");
  });

  it("returns 500 for other Prisma errors", async () => {
    const { PrismaClientKnownRequestError } = await import(
      "@/generated/prisma/internal/prismaNamespace"
    );

    const app = makeApp(
      () =>
        new PrismaClientKnownRequestError("Record not found", {
          code: "P2025",
          clientVersion: "5.0.0",
        }),
    );

    const res = await app.request("/boom");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Database error");
  });

  it("returns JSON content-type for all error responses", async () => {
    const app = makeApp(() => new Error("test"));
    const res = await app.request("/boom");

    expect(res.headers.get("content-type")).toContain("application/json");
  });
});
