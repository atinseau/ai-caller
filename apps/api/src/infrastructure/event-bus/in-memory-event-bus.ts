import { injectable } from "inversify";
import type {
  EventBusPort,
  EventHandler,
} from "@/domain/ports/event-bus.port.ts";
import type { Class } from "@/types.ts";

@injectable()
export class InMemoryEventBus implements EventBusPort {
  // biome-ignore lint/suspicious/noExplicitAny: Handling generic event types
  private readonly handlers: Map<Class, Set<EventHandler<any>>> = new Map();

  async publish<TEvent extends InstanceType<Class>>(
    event: TEvent,
  ): Promise<void> {
    const handlers = this.handlers.get(
      Object.getPrototypeOf(event).constructor,
    );
    if (handlers) {
      await Promise.all([...handlers].map((handler) => handler(event)));
    }
  }

  subscribe<TEvent extends Class>(
    event: TEvent,
    handler: EventHandler<TEvent>,
  ): void {
    const handlers = this.handlers.get(event);
    if (!handlers) {
      this.handlers.set(event, new Set([handler]));
    } else {
      handlers.add(handler);
    }
  }

  unsubscribe<TEvent extends Class>(
    event: TEvent,
    handler: EventHandler<TEvent>,
  ): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }
}
