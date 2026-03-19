import { describe, expect, it, mock } from "bun:test";
import { InMemoryEventBus } from "@/infrastructure/event-bus/in-memory-event-bus";

class TestEvent {
  constructor(public readonly payload: string) {}
}

class OtherEvent {
  constructor(public readonly value: number) {}
}

describe("InMemoryEventBus", () => {
  it("should publish and receive events", async () => {
    const bus = new InMemoryEventBus();
    const handler = mock((_event: TestEvent) => {});

    bus.subscribe(TestEvent, handler);
    await bus.publish(new TestEvent("hello"));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0].payload).toBe("hello");
  });

  it("should support multiple subscribers", async () => {
    const bus = new InMemoryEventBus();
    const handler1 = mock(() => {});
    const handler2 = mock(() => {});

    bus.subscribe(TestEvent, handler1);
    bus.subscribe(TestEvent, handler2);
    await bus.publish(new TestEvent("multi"));

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("should not deliver events to unsubscribed handlers", async () => {
    const bus = new InMemoryEventBus();
    const handler = mock(() => {});

    bus.subscribe(TestEvent, handler);
    bus.unsubscribe(TestEvent, handler);
    await bus.publish(new TestEvent("ignored"));

    expect(handler).not.toHaveBeenCalled();
  });

  it("should isolate event types", async () => {
    const bus = new InMemoryEventBus();
    const testHandler = mock(() => {});
    const otherHandler = mock(() => {});

    bus.subscribe(TestEvent, testHandler);
    bus.subscribe(OtherEvent, otherHandler);

    await bus.publish(new TestEvent("only-test"));

    expect(testHandler).toHaveBeenCalledTimes(1);
    expect(otherHandler).not.toHaveBeenCalled();
  });

  it("should await async handlers", async () => {
    const bus = new InMemoryEventBus();
    const order: number[] = [];

    bus.subscribe(TestEvent, async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push(1);
    });
    bus.subscribe(TestEvent, async () => {
      order.push(2);
    });

    await bus.publish(new TestEvent("async"));

    expect(order).toContain(1);
    expect(order).toContain(2);
  });

  it("should handle publish with no subscribers", async () => {
    const bus = new InMemoryEventBus();
    // Should not throw
    await bus.publish(new TestEvent("no-one-listening"));
  });

  it("should cleanup handler set when last handler unsubscribes", () => {
    const bus = new InMemoryEventBus();
    const handler = mock(() => {});

    bus.subscribe(TestEvent, handler);
    bus.unsubscribe(TestEvent, handler);

    // Internally the map entry should be removed
    // Verify by subscribing again and publishing
    const handler2 = mock(() => {});
    bus.subscribe(TestEvent, handler2);
    bus.publish(new TestEvent("after-cleanup"));

    expect(handler2).toHaveBeenCalledTimes(1);
  });
});
