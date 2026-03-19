import { describe, it } from "bun:test";

describe("OpenAI Realtime Gateway — edge cases", () => {
  it("openRoomChannel should return early when audio room has no callId", async () => {
    // Import the real gateway via DI — no circular dep since we test it standalone
    const { OpenAIRealtimeGateway } = await import(
      "@/infrastructure/gateway/openai-realtime.gateway.ts"
    );

    const sessionService = {
      initSession: () => {
        /* noop */
      },
      destroySession: () => {
        /* noop */
      },
      processMessage: async () => [],
    };

    const gateway = new OpenAIRealtimeGateway(sessionService as never);

    // Should not throw
    await gateway.openRoomChannel(
      {
        id: "r-1",
        companyId: "c-1",
        token: "tok",
        callId: null,
        modality: "AUDIO",
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isTest: false,
      },
      "http://mcp.test",
    );

    // No WS should be created
    gateway.sendToRoom("r-1", { type: "response.create" } as never);
    // Should not crash — just warns
  });

  it("closeRoomChannel should not crash on nonexistent room", () => {
    const {
      OpenAIRealtimeGateway,
    } = require("@/infrastructure/gateway/openai-realtime.gateway.ts");

    const sessionService = {
      initSession: () => {
        /* noop */
      },
      destroySession: () => {
        /* noop */
      },
      processMessage: async () => [],
    };

    const gateway = new OpenAIRealtimeGateway(sessionService as never);
    // Should not throw
    gateway.closeRoomChannel("nonexistent-room");
  });

  it("sendToRoom should not crash on nonexistent room", () => {
    const {
      OpenAIRealtimeGateway,
    } = require("@/infrastructure/gateway/openai-realtime.gateway.ts");

    const sessionService = {
      initSession: () => {
        /* noop */
      },
      destroySession: () => {
        /* noop */
      },
      processMessage: async () => [],
    };

    const gateway = new OpenAIRealtimeGateway(sessionService as never);
    // Should not throw
    gateway.sendToRoom("nonexistent", { type: "response.create" } as never);
  });
});
