import { describe, expect, it, beforeAll, beforeEach, afterAll, afterEach } from "bun:test";
import { CompanyUseCase } from "@/application/use-cases/company.use-case";
import { createTestContext } from "../helpers/test-context";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
} from "../helpers/setup";

beforeAll(async () => {
  await setupTestEnvironment();
});

afterAll(() => teardownTestEnvironment());

const ctx = createTestContext();
beforeEach(ctx.setup);
afterEach(ctx.teardown);

describe("CompanyUseCase", () => {
  it("should create a company", async () => {
    const useCase = ctx.container.get(CompanyUseCase);

    const company = await useCase.create({
      name: `test-company-${Date.now()}`,
      mcpUrl: "http://localhost:9999/mcp",
    });

    expect(company.id).toBeDefined();
    expect(company.name).toContain("test-company-");
    expect(company.mcpUrl).toBe("http://localhost:9999/mcp");
    expect(company.createdAt).toBeInstanceOf(Date);
  });

  it("should list companies", async () => {
    const useCase = ctx.container.get(CompanyUseCase);

    await useCase.create({
      name: `list-test-1-${Date.now()}`,
      mcpUrl: "http://localhost:9999/mcp",
    });
    await useCase.create({
      name: `list-test-2-${Date.now()}`,
      mcpUrl: "http://localhost:9999/mcp",
    });

    const companies = await useCase.list();
    expect(companies.length).toBeGreaterThanOrEqual(2);
  });
});
