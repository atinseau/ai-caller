import { describe, expect, it, setDefaultTimeout } from "bun:test";

setDefaultTimeout(60_000);

import type { Schema } from "@ai-caller/shared";
import { env } from "@/infrastructure/config/env.ts";

/**
 * End-to-end text flow test.
 * Proves: real OpenAI connection → send text → receive text response.
 * This is the most important test: it validates the entire text pipeline.
 */
describe("E2E Text Flow (real OpenAI)", () => {
  it("should complete a full text conversation: connect → send → receive", async () => {
    const apiKey = env.get("OPENAI_API_KEY");

    const ws = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-realtime-1.5",
      { headers: { Authorization: `Bearer ${apiKey}` } } as never,
    );

    const conversationResult = await new Promise<{
      connected: boolean;
      configuredText: boolean;
      response: string;
    }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("E2E timeout (15s)"));
      }, 15_000);

      const state = {
        connected: false,
        configuredText: false,
        response: "",
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data) as Schema["RealtimeServerEvent"];

        if (data.type === "session.created") {
          state.connected = true;
          // Step 1: configure text mode
          ws.send(
            JSON.stringify({
              type: "session.update",
              session: { type: "realtime", output_modalities: ["text"] },
            }),
          );
        }

        if (data.type === "session.updated") {
          state.configuredText = true;
          // Step 2: send a user message
          ws.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: "What is 2+2? Reply with just the number.",
                  },
                ],
              },
            }),
          );
          // Step 3: trigger response
          ws.send(JSON.stringify({ type: "response.create" }));
        }

        // Collect text deltas
        if (data.type === "response.output_text.delta") {
          state.response += data.delta ?? "";
        }

        // Response complete
        if (data.type === "response.done") {
          clearTimeout(timeout);
          resolve(state);
        }
      };

      ws.onerror = (event) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${event}`));
      };
    });

    ws.close();

    expect(conversationResult.connected).toBe(true);
    expect(conversationResult.configuredText).toBe(true);
    expect(conversationResult.response.length).toBeGreaterThan(0);
    expect(conversationResult.response).toContain("4");
  });

  it("should maintain context across multiple turns", async () => {
    const apiKey = env.get("OPENAI_API_KEY");

    const ws = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-realtime-1.5",
      { headers: { Authorization: `Bearer ${apiKey}` } } as never,
    );

    const responses: string[] = [];

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Multi-turn timeout (30s)"));
      }, 30_000);

      let currentResponse = "";
      let turnCount = 0;

      const sendMessage = (text: string) => {
        ws.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text }],
            },
          }),
        );
        ws.send(JSON.stringify({ type: "response.create" }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data) as Schema["RealtimeServerEvent"];

        if (data.type === "session.created") {
          ws.send(
            JSON.stringify({
              type: "session.update",
              session: { type: "realtime", output_modalities: ["text"] },
            }),
          );
        }

        if (data.type === "session.updated" && turnCount === 0) {
          // Turn 1: set context
          sendMessage("My name is TestUser42. Remember this name.");
        }

        if (data.type === "response.output_text.delta") {
          currentResponse += data.delta ?? "";
        }

        if (data.type === "response.done") {
          responses.push(currentResponse);
          currentResponse = "";
          turnCount++;

          if (turnCount === 1) {
            // Turn 2: ask about the context
            sendMessage(
              "What is my name? Reply with just the name, nothing else.",
            );
          } else if (turnCount === 2) {
            clearTimeout(timeout);
            resolve();
          }
        }
      };

      ws.onerror = (event) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${event}`));
      };
    });

    ws.close();

    expect(responses).toHaveLength(2);
    // Second response should contain the name from context
    expect(responses[1]).toContain("TestUser42");
  });
});
