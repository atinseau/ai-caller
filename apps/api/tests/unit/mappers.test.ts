import { describe, expect, it } from "bun:test";
import { CompanyMapper } from "@/infrastructure/database/mappers/company.mapper.ts";
import { RoomMapper } from "@/infrastructure/database/mappers/room.mapper.ts";
import { ToolInvokeMapper } from "@/infrastructure/database/mappers/tool.mapper.ts";

describe("CompanyMapper", () => {
  it("toModel should map all Prisma fields to domain model", () => {
    const prismaCompany = {
      id: "c-1",
      name: "Test Co",
      mcpUrl: "http://mcp.test",
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-02"),
      status: "INACTIVE" as const,
      description: "A test company",
      systemPromptSections: { roleObjective: "You are a helpful assistant" },
      toolConfigs: null,
      systemToolPrompts: null,
      voice: "marin",
      language: "fr",
      vadEagerness: "medium",
    };

    const model = CompanyMapper.toModel(prismaCompany);

    expect(model.id).toBe("c-1");
    expect(model.name).toBe("Test Co");
    expect(model.mcpUrl).toBe("http://mcp.test");
    expect(model.createdAt).toEqual(new Date("2025-01-01"));
    expect(model.updatedAt).toEqual(new Date("2025-01-02"));
    expect(model.voice).toBe("marin");
    expect(model.language).toBe("fr");
    expect(model.vadEagerness).toBe("medium");
  });

  it("toModel should handle null voice/language/vadEagerness", () => {
    const prismaCompany = {
      id: "c-2",
      name: "Null Fields Co",
      mcpUrl: null,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-02"),
      status: "INACTIVE" as const,
      description: null,
      systemPromptSections: null,
      toolConfigs: null,
      systemToolPrompts: null,
      voice: null,
      language: null,
      vadEagerness: null,
    };

    const model = CompanyMapper.toModel(prismaCompany);

    expect(model.voice).toBeNull();
    expect(model.language).toBeNull();
    expect(model.vadEagerness).toBeNull();
  });

  it("toEntity should generate id and timestamps", () => {
    const entity = CompanyMapper.toEntity({
      name: "New Co",
      description: "A new company",
    });

    expect(entity.id).toBeDefined();
    expect(entity.id?.length).toBeGreaterThan(0);
    expect(entity.name).toBe("New Co");
    expect(entity.voice).toBeNull();
    expect(entity.language).toBeNull();
    expect(entity.vadEagerness).toBeNull();
  });
});

describe("RoomMapper", () => {
  it("toModel should map all Prisma fields including modality", () => {
    const prismaRoom = {
      id: "r-1",
      companyId: "c-1",
      token: "tok-123",
      callId: "call-1",
      expiresAt: new Date("2025-12-31"),
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-02"),
      deletedAt: null,
      modality: "TEXT" as const,
      isTest: false,
      source: "WEBRTC" as const,
      twilioStreamSid: null,
    };

    const model = RoomMapper.toModel(prismaRoom);

    expect(model.id).toBe("r-1");
    expect(model.companyId).toBe("c-1");
    expect(model.token).toBe("tok-123");
    expect(model.callId).toBe("call-1");
    expect(model.modality).toBe("TEXT");
  });

  it("toEntity should generate id and default modality to AUDIO", () => {
    const entity = RoomMapper.toEntity({
      companyId: "c-1",
      token: "tok-456",
    });

    expect(entity.id).toBeDefined();
    expect(entity.companyId).toBe("c-1");
    expect(entity.token).toBe("tok-456");
    expect(entity.modality).toBe("AUDIO");
    expect(entity.deletedAt).toBeNull();
    expect(entity.expiresAt).toBeInstanceOf(Date);
  });

  it("toEntity should use provided modality and expiresAt", () => {
    const expires = new Date("2025-06-01");
    const entity = RoomMapper.toEntity({
      companyId: "c-1",
      token: "tok-789",
      expiresAt: expires,
      modality: "TEXT",
    });

    expect(entity.modality).toBe("TEXT");
    expect(entity.expiresAt).toEqual(expires);
  });
});

describe("ToolInvokeMapper", () => {
  it("toModel should map all Prisma fields including toolName", () => {
    const prismaToolInvoke = {
      id: "t-1",
      entityId: "e-1",
      toolName: "search_customer",
      roomId: "r-1",
      status: "RUNNING" as const,
      args: { name: "John" },
      results: null,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-02"),
    };

    const model = ToolInvokeMapper.toModel(prismaToolInvoke);

    expect(model.id).toBe("t-1");
    expect(model.entityId).toBe("e-1");
    expect(model.toolName).toBe("search_customer");
    expect(model.roomId).toBe("r-1");
    expect(model.status).toBe("RUNNING");
    expect(model.args).toEqual({ name: "John" });
  });

  it("toEntity should generate id with default RUNNING status", () => {
    const entity = ToolInvokeMapper.toEntity({
      entityId: "e-2",
      roomId: "r-1",
      toolName: "get_weather",
      args: { city: "Paris" },
    });

    expect(entity.id).toBeDefined();
    expect(entity.entityId).toBe("e-2");
    expect(entity.toolName).toBe("get_weather");
    expect(entity.status).toBe("RUNNING");
    expect(entity.createdAt).toBeInstanceOf(Date);
  });

  it("toModel should handle null toolName as undefined", () => {
    const model = ToolInvokeMapper.toModel({
      id: "t-2",
      entityId: "e-3",
      toolName: null,
      roomId: "r-1",
      status: "COMPLETED" as const,
      args: {},
      results: { data: "ok" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(model.toolName).toBeUndefined();
  });
});
