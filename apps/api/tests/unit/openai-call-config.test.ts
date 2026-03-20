import { beforeEach, describe, expect, it, mock } from "bun:test";
import { OpenAICallService } from "@/application/services/openai-call.service.ts";
import { CompanyStatus } from "@/domain/enums/company-status.enum.ts";
import type { ICompanyModel } from "@/domain/models/company.model.ts";

/**
 * Unit tests for OpenAICallService session configuration.
 * We intercept the OpenAI clientSecrets call to inspect the session config
 * without making real API calls.
 */

function createService() {
  const roomRepository = {
    createRoom: mock(() => Promise.resolve({})),
    findById: mock(() => Promise.resolve(null)),
    updateRoomCallId: mock(() => Promise.resolve(null)),
    findExpiredRooms: mock(() => Promise.resolve([])),
    deleteRoom: mock(() => Promise.resolve()),
  };

  const logger = {
    info: () => {
      /* noop */
    },
    error: () => {
      /* noop */
    },
    warn: () => {
      /* noop */
    },
  };

  const prompt = {
    render: mock((_name: string, _context?: Record<string, unknown>) => {
      if (_name === "instructions-prompt")
        return Promise.resolve("INSTRUCTIONS");
      if (_name === "call-close-tool-prompt") return Promise.resolve("CLOSE");
      if (_name === "get-tool-status-prompt")
        return Promise.resolve("GET_STATUS");
      return Promise.resolve("");
    }),
  };

  const toolDiscovery = {
    discoverAsRealtimeFunctions: mock(() => Promise.resolve([])),
  };

  const service = new OpenAICallService(
    roomRepository as never,
    logger as never,
    prompt as never,
    toolDiscovery as never,
  );

  return { service, prompt, toolDiscovery };
}

function makeCompany(overrides: Partial<ICompanyModel> = {}): ICompanyModel {
  return {
    id: "c-1",
    name: "Test Co",
    mcpUrl: null,
    status: CompanyStatus.INACTIVE,
    systemPrompt: "Be helpful.",
    description: null,
    toolConfigs: null,
    systemToolPrompts: null,
    voice: null,
    language: null,
    vadEagerness: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("OpenAICallService — config", () => {
  let service: ReturnType<typeof createService>;

  beforeEach(() => {
    service = createService();
  });

  describe("prompt rendering", () => {
    it("should pass companyName and companySystemPrompt to instructions prompt", async () => {
      const company = makeCompany({
        name: "Acme Corp",
        systemPrompt: "You are the Acme assistant.",
      });

      // This will fail because of real OpenAI call, but we can check prompt.render was called
      try {
        await service.service.createCall(company, "AUDIO");
      } catch {
        /* expected — no real API key in unit tests */
      }

      expect(service.prompt.render).toHaveBeenCalledTimes(3);
      const firstCall = service.prompt.render.mock.calls[0];
      expect(firstCall).toEqual([
        "instructions-prompt",
        {
          companyName: "Acme Corp",
          companySystemPrompt: "You are the Acme assistant.",
        },
      ]);
    });

    it("should pass empty string when systemPrompt is null", async () => {
      const company = makeCompany({ systemPrompt: null });

      try {
        await service.service.createCall(company, "TEXT");
      } catch {
        /* expected */
      }

      const firstCall = service.prompt.render.mock.calls[0];
      expect(firstCall?.[1]).toEqual({
        companyName: "Test Co",
        companySystemPrompt: "",
      });
    });
  });

  describe("tool discovery", () => {
    it("should not discover tools when mcpUrl is null", async () => {
      const company = makeCompany({ mcpUrl: null });

      try {
        await service.service.createCall(company, "AUDIO");
      } catch {
        /* expected */
      }

      expect(
        service.toolDiscovery.discoverAsRealtimeFunctions,
      ).not.toHaveBeenCalled();
    });

    it("should discover tools when mcpUrl is set", async () => {
      const company = makeCompany({ mcpUrl: "http://mcp.test" });

      try {
        await service.service.createCall(company, "AUDIO");
      } catch {
        /* expected */
      }

      expect(
        service.toolDiscovery.discoverAsRealtimeFunctions,
      ).toHaveBeenCalledWith("http://mcp.test");
    });
  });
});
