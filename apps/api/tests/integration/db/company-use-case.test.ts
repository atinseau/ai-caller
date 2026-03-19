import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { HTTPException } from "hono/http-exception";
import { CompanyUseCase } from "@/application/use-cases/company.use-case.ts";
import { CompanyStatus } from "@/domain/enums/company-status.enum.ts";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port.ts";
import {
  mockMcpServer,
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

  describe("activation validation", () => {
    async function createCompanyWithFields(
      useCase: CompanyUseCase,
      repo: CompanyRepositoryPort,
      fields: {
        systemPrompt?: string | null;
        mcpUrl?: string | null;
      },
    ) {
      const company = await useCase.create({
        name: `activation-test-${Date.now()}-${Math.random()}`,
      });
      if (fields.systemPrompt !== undefined || fields.mcpUrl !== undefined) {
        return repo.updateCompany(company.id, {
          systemPrompt: fields.systemPrompt ?? null,
          mcpUrl: fields.mcpUrl ?? null,
        });
      }
      return company;
    }

    it("should reject activation when system prompt is empty", async () => {
      const useCase = ctx.container.get(CompanyUseCase);
      const repo = ctx.container.get(CompanyRepositoryPort);
      const company = await createCompanyWithFields(useCase, repo, {
        mcpUrl: mockMcpServer.url,
      });

      await expect(
        useCase.update(company.id, { status: CompanyStatus.ACTIVE }),
      ).rejects.toThrow(HTTPException);

      try {
        await useCase.update(company.id, { status: CompanyStatus.ACTIVE });
      } catch (e) {
        expect(e).toBeInstanceOf(HTTPException);
        expect((e as HTTPException).status).toBe(400);
        expect((e as HTTPException).message).toContain("system prompt");
      }
    });

    it("should reject activation when MCP URL is not configured", async () => {
      const useCase = ctx.container.get(CompanyUseCase);
      const repo = ctx.container.get(CompanyRepositoryPort);
      const company = await createCompanyWithFields(useCase, repo, {
        systemPrompt: "Test prompt",
      });

      try {
        await useCase.update(company.id, { status: CompanyStatus.ACTIVE });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(HTTPException);
        expect((e as HTTPException).status).toBe(400);
        expect((e as HTTPException).message).toContain("MCP server URL");
      }
    });

    it("should reject activation when MCP server is unreachable", async () => {
      const useCase = ctx.container.get(CompanyUseCase);
      const repo = ctx.container.get(CompanyRepositoryPort);
      const company = await createCompanyWithFields(useCase, repo, {
        systemPrompt: "Test prompt",
        mcpUrl: "http://localhost:1/unreachable",
      });

      try {
        await useCase.update(company.id, { status: CompanyStatus.ACTIVE });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(HTTPException);
        expect((e as HTTPException).status).toBe(400);
        expect((e as HTTPException).message).toContain("unreachable");
      }
    });

    it("should allow activation when all conditions are met", async () => {
      const useCase = ctx.container.get(CompanyUseCase);
      const repo = ctx.container.get(CompanyRepositoryPort);
      const company = await createCompanyWithFields(useCase, repo, {
        systemPrompt: "Test prompt for activation",
        mcpUrl: mockMcpServer.url,
      });

      const updated = await useCase.update(company.id, {
        status: CompanyStatus.ACTIVE,
      });

      expect(updated.status).toBe(CompanyStatus.ACTIVE);
    });

    it("should reject clearing system prompt on an active company", async () => {
      const useCase = ctx.container.get(CompanyUseCase);
      const repo = ctx.container.get(CompanyRepositoryPort);
      const company = await createCompanyWithFields(useCase, repo, {
        systemPrompt: "Active prompt",
        mcpUrl: mockMcpServer.url,
      });

      await useCase.update(company.id, { status: CompanyStatus.ACTIVE });

      try {
        await useCase.update(company.id, { systemPrompt: "" });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(HTTPException);
        expect((e as HTTPException).status).toBe(400);
        expect((e as HTTPException).message).toContain(
          "Cannot clear the system prompt",
        );
      }
    });

    it("should reject clearing system prompt to null on an active company", async () => {
      const useCase = ctx.container.get(CompanyUseCase);
      const repo = ctx.container.get(CompanyRepositoryPort);
      const company = await createCompanyWithFields(useCase, repo, {
        systemPrompt: "Active prompt",
        mcpUrl: mockMcpServer.url,
      });

      await useCase.update(company.id, { status: CompanyStatus.ACTIVE });

      try {
        await useCase.update(company.id, { systemPrompt: null });
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(HTTPException);
        expect((e as HTTPException).status).toBe(400);
        expect((e as HTTPException).message).toContain(
          "Cannot clear the system prompt",
        );
      }
    });

    it("should allow updating non-prompt fields on an active company", async () => {
      const useCase = ctx.container.get(CompanyUseCase);
      const repo = ctx.container.get(CompanyRepositoryPort);
      const company = await createCompanyWithFields(useCase, repo, {
        systemPrompt: "Active prompt",
        mcpUrl: mockMcpServer.url,
      });

      await useCase.update(company.id, { status: CompanyStatus.ACTIVE });

      const updated = await useCase.update(company.id, {
        description: "Updated description",
      });
      expect(updated.description).toBe("Updated description");
    });

    it("should not re-validate when company is already active and status is not changing", async () => {
      const useCase = ctx.container.get(CompanyUseCase);
      const repo = ctx.container.get(CompanyRepositoryPort);
      const company = await createCompanyWithFields(useCase, repo, {
        systemPrompt: "Active prompt",
        mcpUrl: mockMcpServer.url,
      });

      await useCase.update(company.id, { status: CompanyStatus.ACTIVE });

      const updated = await useCase.update(company.id, {
        systemPrompt: "New prompt",
      });
      expect(updated.systemPrompt).toBe("New prompt");
    });
  });
});
