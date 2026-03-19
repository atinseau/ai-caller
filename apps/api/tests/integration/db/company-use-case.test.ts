import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { CompanyUseCase } from "@/application/use-cases/company.use-case.ts";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
} from "@/tests/helpers/setup";
import { createTestContext } from "@/tests/helpers/test-context";

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
    });

    expect(company.id).toBeDefined();
    expect(company.name).toContain("test-company-");
    expect(company.createdAt).toBeInstanceOf(Date);
  });

  it("should list companies", async () => {
    const useCase = ctx.container.get(CompanyUseCase);

    await useCase.create({
      name: `list-test-1-${Date.now()}`,
    });
    await useCase.create({
      name: `list-test-2-${Date.now()}`,
    });

    const companies = await useCase.list();
    expect(companies.length).toBeGreaterThanOrEqual(2);
  });
});
