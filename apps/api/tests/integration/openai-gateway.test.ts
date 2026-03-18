import { describe, expect, it, setDefaultTimeout } from "bun:test";

setDefaultTimeout(30_000);
import type { Schema } from "@ai-caller/shared";
import { env } from "@/infrastructure/config/env";

/**
 * These tests use the REAL OpenAI Realtime API.
 * They prove actual WebSocket connectivity to gpt-realtime-1.5.
 * Slower (~3-10s each), costs API credits.
 */
describe("OpenAI Realtime Gateway (real API)", () => {
  it("should open a text-mode WebSocket to OpenAI and receive session.created", async () => {
    const apiKey = env.get("OPENAI_API_KEY");

    const ws = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-realtime-1.5",
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      } as never,
    );

    const sessionCreated = await new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Timeout waiting for session.created"));
      }, 10_000);

      ws.onopen = () => {
        // Configure text mode
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: { type: "realtime", output_modalities: ["text"] },
          }),
        );
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data) as Schema["RealtimeServerEvent"];
        if (
          data.type === "session.created" ||
          data.type === "session.updated"
        ) {
          clearTimeout(timeout);
          resolve(true);
        }
      };

      ws.onerror = (event) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${event}`));
      };
    });

    ws.close();
    expect(sessionCreated).toBe(true);
  });

  it("should send a text message and receive a text response from gpt-realtime-1.5", async () => {
    const apiKey = env.get("OPENAI_API_KEY");

    const ws = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-realtime-1.5",
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      } as never,
    );

    const responseText = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Timeout waiting for text response"));
      }, 20_000);

      let textConfigured = false;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data) as Schema["RealtimeServerEvent"];

        // Step 1: on session.created → configure text mode
        if (data.type === "session.created") {
          ws.send(
            JSON.stringify({
              type: "session.update",
              session: { type: "realtime", output_modalities: ["text"] },
            }),
          );
        }

        // Step 2: on session.updated → send message
        if (data.type === "session.updated" && !textConfigured) {
          textConfigured = true;
          ws.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: 'Reply with exactly: "HELLO_TEST_OK"',
                  },
                ],
              },
            }),
          );
          ws.send(JSON.stringify({ type: "response.create" }));
        }

        // Step 3: collect response
        if (data.type === "response.output_text.done") {
          clearTimeout(timeout);
          resolve(data.text ?? "");
        }
      };

      ws.onerror = (event) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${event}`));
      };
    });

    ws.close();
    expect(responseText.length).toBeGreaterThan(0);
    expect(responseText.toUpperCase()).toContain("HELLO_TEST_OK");
  });
});

describe("OpenAI Realtime Gateway — edge cases", () => {
  it("openRoomChannel should return early when audio room has no callId", async () => {
    // Import the real gateway via DI — no circular dep since we test it standalone
    const { OpenAIRealtimeGateway } = await import(
      "@/infrastructure/gateway/openai-realtime.gateway"
    );

    const sessionService = {
      initSession: () => {},
      destroySession: () => {},
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
    const { OpenAIRealtimeGateway } = require(
      "@/infrastructure/gateway/openai-realtime.gateway",
    );

    const sessionService = {
      initSession: () => {},
      destroySession: () => {},
      processMessage: async () => [],
    };

    const gateway = new OpenAIRealtimeGateway(sessionService as never);
    // Should not throw
    gateway.closeRoomChannel("nonexistent-room");
  });

  it("sendToRoom should not crash on nonexistent room", () => {
    const { OpenAIRealtimeGateway } = require(
      "@/infrastructure/gateway/openai-realtime.gateway",
    );

    const sessionService = {
      initSession: () => {},
      destroySession: () => {},
      processMessage: async () => [],
    };

    const gateway = new OpenAIRealtimeGateway(sessionService as never);
    // Should not throw
    gateway.sendToRoom("nonexistent", { type: "response.create" } as never);
  });
});
