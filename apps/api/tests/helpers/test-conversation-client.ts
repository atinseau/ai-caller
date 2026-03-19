import type { Hono } from "hono";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import type { TextStreamEvent } from "@/domain/ports/text-stream.port.ts";

/**
 * Programmatic client for testing text-mode conversations.
 * Sends messages via HTTP and collects SSE responses.
 */
export class TestConversationClient {
  constructor(
    private readonly app: Hono,
    readonly _baseUrl = "http://localhost",
  ) {}

  async createTextRoom(companyId: string): Promise<IRoomModel> {
    const res = await this.app.request("/api/v1/room/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, modality: "TEXT" }),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to create room: ${res.status} ${await res.text()}`,
      );
    }

    const data = (await res.json()) as { data: IRoomModel };
    return data.data;
  }

  async sendMessage(roomId: string, text: string): Promise<void> {
    const res = await this.app.request(`/api/v1/room/${roomId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to send message: ${res.status} ${await res.text()}`,
      );
    }
  }

  async collectResponses(
    roomId: string,
    options: { timeout?: number; maxEvents?: number } = {},
  ): Promise<TextStreamEvent[]> {
    const { timeout = 10000, maxEvents = 50 } = options;
    const events: TextStreamEvent[] = [];

    const res = await this.app.request(`/api/v1/room/${roomId}/stream`, {
      method: "GET",
    });

    if (!res.ok || !res.body) {
      throw new Error(`Failed to connect to stream: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    const timeoutPromise = new Promise<void>((resolve) =>
      setTimeout(resolve, timeout),
    );

    const readPromise = (async () => {
      let buffer = "";
      while (events.length < maxEvents) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data:")) {
            try {
              const event = JSON.parse(line.slice(5).trim()) as TextStreamEvent;
              events.push(event);

              if (event.type === "text_done") return;
            } catch {
              // skip malformed events
            }
          }
        }
      }
    })();

    await Promise.race([readPromise, timeoutPromise]);
    reader.cancel().catch(() => {
      /* intentionally ignored */
    });

    return events;
  }
}
