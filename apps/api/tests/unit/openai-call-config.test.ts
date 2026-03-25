import { beforeEach, describe, expect, it, mock } from "bun:test";
import { OpenAICallService } from "@/application/services/openai-call.service.ts";
import { CompanyStatus } from "@/domain/enums/company-status.enum.ts";
import type { ICompanyModel } from "@/domain/models/company.model.ts";

/**
 * Unit tests for OpenAICallService session configuration.
 * We intercept the OpenAI clientSecrets call to inspect the session config
 * without making real API calls.
 */

function createServiceWithCache(cacheOverrides: Record<string, unknown> = {}) {
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
    render: mock((_name: string) => {
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

  const contactService = {
    findOrCreate: mock(() => Promise.resolve({ id: "contact-1" })),
    linkToRoom: mock(() => Promise.resolve()),
  };

  const voicePreview = {
    listVoices: () => [{ id: "eve", label: "Eve", tone: "Energetic" }],
    generatePreview: mock(() => Promise.resolve(new ReadableStream())),
  };

  const roomEventRepository = {
    findByRoomId: mock(() => Promise.resolve([])),
  };

  const cache = {
    get: mock(() => Promise.resolve(null)),
    set: mock(() => Promise.resolve()),
    delete: mock(() => Promise.resolve()),
    deletePattern: mock(() => Promise.resolve()),
    has: mock(() => Promise.resolve(false)),
    ...cacheOverrides,
  };

  const service = new OpenAICallService(
    roomRepository as never,
    roomEventRepository as never,
    logger as never,
    prompt as never,
    toolDiscovery as never,
    contactService as never,
    voicePreview as never,
    cache as never,
  );

  return { service, prompt, toolDiscovery, cache };
}

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

  const contactService = {
    findOrCreate: mock(() => Promise.resolve({ id: "contact-1" })),
    linkToRoom: mock(() => Promise.resolve()),
  };

  const voicePreview = {
    listVoices: () => [{ id: "eve", label: "Eve", tone: "Energetic" }],
    generatePreview: mock(() => Promise.resolve(new ReadableStream())),
  };

  const roomEventRepository = {
    findByRoomId: mock(() => Promise.resolve([])),
  };

  const cache = {
    get: mock(() => Promise.resolve(null)),
    set: mock(() => Promise.resolve()),
    delete: mock(() => Promise.resolve()),
    deletePattern: mock(() => Promise.resolve()),
    has: mock(() => Promise.resolve(false)),
  };

  const service = new OpenAICallService(
    roomRepository as never,
    roomEventRepository as never,
    logger as never,
    prompt as never,
    toolDiscovery as never,
    contactService as never,
    voicePreview as never,
    cache as never,
  );

  return { service, prompt, toolDiscovery };
}

function makeCompany(overrides: Partial<ICompanyModel> = {}): ICompanyModel {
  return {
    id: "c-1",
    name: "Test Co",
    mcpUrl: null,
    status: CompanyStatus.INACTIVE,
    systemPromptSections: { roleObjective: "Be helpful." },
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
    it("should pass section fields to instructions prompt", async () => {
      const company = makeCompany({
        name: "Acme Corp",
        systemPromptSections: {
          roleObjective: "You are the Acme assistant.",
          context: "Acme sells widgets.",
        },
      });

      await service.service.buildSessionConfig(company, "AUDIO");

      expect(service.prompt.render).toHaveBeenCalledTimes(3);
      const firstCall = service.prompt.render.mock.calls[0];
      expect(firstCall).toEqual([
        "instructions-prompt",
        {
          companyName: "Acme Corp",
          roleObjective: "You are the Acme assistant.",
          personalityTone: "",
          context: "Acme sells widgets.",
          referencePronunciations: "",
          instructionsRules: "",
          conversationFlow: "",
          safetyEscalation: "",
          language: "",
          contactSummary: "",
        },
      ]);
    });

    it("should pass empty strings when systemPromptSections is null", async () => {
      const company = makeCompany({ systemPromptSections: null });

      await service.service.buildSessionConfig(company, "TEXT");

      const firstCall = service.prompt.render.mock.calls[0];
      expect(firstCall?.[1]).toEqual({
        companyName: "Test Co",
        roleObjective: "",
        personalityTone: "",
        context: "",
        referencePronunciations: "",
        instructionsRules: "",
        conversationFlow: "",
        safetyEscalation: "",
        language: "",
        contactSummary: "",
      });
    });
  });

  describe("tool discovery", () => {
    it("should not discover tools when mcpUrl is null", async () => {
      const company = makeCompany({ mcpUrl: null });

      await service.service.buildSessionConfig(company, "AUDIO");

      expect(
        service.toolDiscovery.discoverAsRealtimeFunctions,
      ).not.toHaveBeenCalled();
    });

    it("should discover tools when mcpUrl is set", async () => {
      const company = makeCompany({ mcpUrl: "http://mcp.test" });

      await service.service.buildSessionConfig(company, "AUDIO");

      expect(
        service.toolDiscovery.discoverAsRealtimeFunctions,
      ).toHaveBeenCalledWith("http://mcp.test");
    });
  });
});

describe("OpenAICallService — buildAudioProviderConfig cache", () => {
  it("should return cached config when cache hit and no contactSummary", async () => {
    const cachedConfig = {
      instructions: "CACHED",
      tools: [],
      voice: "marin",
      language: "fr",
    };
    const svc = createServiceWithCache({
      get: mock(() => Promise.resolve(cachedConfig)),
    });
    const company = makeCompany();

    const result = await svc.service.buildAudioProviderConfig(company);

    expect(result).toEqual(cachedConfig);
    // prompt.render should NOT be called since we hit cache
    expect(svc.prompt.render).not.toHaveBeenCalled();
  });

  it("should skip cache when contactSummary is provided", async () => {
    const cachedConfig = {
      instructions: "CACHED",
      tools: [],
      voice: "marin",
    };
    const svc = createServiceWithCache({
      get: mock(() => Promise.resolve(cachedConfig)),
    });
    const company = makeCompany();

    const result = await svc.service.buildAudioProviderConfig(
      company,
      "User called yesterday about order #123",
    );

    // Should rebuild even though cache has data, because contactSummary is provided
    expect(result.instructions).toBe("INSTRUCTIONS");
    expect(svc.prompt.render).toHaveBeenCalled();
  });

  it("should cache the config after miss (no contactSummary)", async () => {
    const svc = createServiceWithCache();
    const company = makeCompany();

    await svc.service.buildAudioProviderConfig(company);

    expect(svc.cache.set).toHaveBeenCalledWith(
      `audio-config:${company.id}`,
      expect.objectContaining({ instructions: "INSTRUCTIONS" }),
      300,
    );
  });

  it("should NOT cache when contactSummary is provided", async () => {
    const svc = createServiceWithCache();
    const company = makeCompany();

    await svc.service.buildAudioProviderConfig(company, "Some summary");

    expect(svc.cache.set).not.toHaveBeenCalled();
  });
});
