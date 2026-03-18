import { describe, expect, it } from "bun:test";
import { InMemoryTextStream } from "@/infrastructure/stream/in-memory-text-stream";

describe("Text Conversation", () => {
  describe("InMemoryTextStream", () => {
    it("should publish and receive events via subscribe", async () => {
      const stream = new InMemoryTextStream();
      const roomId = "test-room-1";

      // Start collecting
      const events = stream.subscribe(roomId);
      const collected: unknown[] = [];

      const reader = (async () => {
        for await (const event of events) {
          collected.push(event);
          if (event.type === "text_done") break;
        }
      })();

      // Publish events
      stream.publish(roomId, { type: "text_delta", text: "Hello " });
      stream.publish(roomId, { type: "text_delta", text: "world" });
      stream.publish(roomId, { type: "text_done", text: "Hello world" });

      await reader;

      expect(collected).toHaveLength(3);
      expect(collected[0]).toEqual({ type: "text_delta", text: "Hello " });
      expect(collected[1]).toEqual({ type: "text_delta", text: "world" });
      expect(collected[2]).toEqual({
        type: "text_done",
        text: "Hello world",
      });
    });

    it("should handle tool status events", async () => {
      const stream = new InMemoryTextStream();
      const roomId = "test-room-2";

      const events = stream.subscribe(roomId);
      const collected: unknown[] = [];

      const reader = (async () => {
        for await (const event of events) {
          collected.push(event);
          if (
            "status" in event &&
            (event as { status: string }).status === "COMPLETED"
          )
            break;
        }
      })();

      stream.publish(roomId, {
        type: "tool_status",
        toolInvokeId: "invoke-1",
        status: "RUNNING",
        toolName: "search_customer",
      });
      stream.publish(roomId, {
        type: "tool_status",
        toolInvokeId: "invoke-1",
        status: "COMPLETED",
        toolName: "search_customer",
      });

      await reader;

      expect(collected).toHaveLength(2);
    });

    it("should close stream and stop iteration", async () => {
      const stream = new InMemoryTextStream();
      const roomId = "test-room-3";

      const events = stream.subscribe(roomId);
      const collected: unknown[] = [];

      const reader = (async () => {
        for await (const event of events) {
          collected.push(event);
        }
      })();

      stream.publish(roomId, { type: "text_delta", text: "partial" });

      // Small delay to ensure event is processed
      await new Promise((r) => setTimeout(r, 10));

      stream.close(roomId);
      await reader;

      expect(collected).toHaveLength(1);
    });

    it("should not publish to closed streams", () => {
      const stream = new InMemoryTextStream();
      const roomId = "test-room-4";

      stream.close(roomId);
      // Should not throw
      stream.publish(roomId, { type: "text_delta", text: "ignored" });
    });

    it("should handle multiple rooms independently", async () => {
      const stream = new InMemoryTextStream();

      const events1 = stream.subscribe("room-a");
      const events2 = stream.subscribe("room-b");

      const collected1: unknown[] = [];
      const collected2: unknown[] = [];

      const reader1 = (async () => {
        for await (const e of events1) {
          collected1.push(e);
          if (e.type === "text_done") break;
        }
      })();

      const reader2 = (async () => {
        for await (const e of events2) {
          collected2.push(e);
          if (e.type === "text_done") break;
        }
      })();

      stream.publish("room-a", {
        type: "text_done",
        text: "Response for A",
      });
      stream.publish("room-b", {
        type: "text_done",
        text: "Response for B",
      });

      await Promise.all([reader1, reader2]);

      expect(collected1).toHaveLength(1);
      expect(collected2).toHaveLength(1);
      expect((collected1[0] as { text: string }).text).toBe("Response for A");
      expect((collected2[0] as { text: string }).text).toBe("Response for B");
    });
  });
});
