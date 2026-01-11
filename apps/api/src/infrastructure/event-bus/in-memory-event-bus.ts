import { injectable } from "inversify";
import type {
  EventBusPort,
  EventHandler,
} from "@/application/ports/event-bus.port";
import type { Class } from "@/types";

@injectable()
export class InMemoryEventBus implements EventBusPort {
  // biome-ignore lint/suspicious/noExplicitAny: Handling generic event types
  private readonly handlers: Map<Class, Set<EventHandler<any>>> = new Map();

  publish<TEvent extends InstanceType<Class>>(event: TEvent): void {
    const handlers = this.handlers.get(
      Object.getPrototypeOf(event).constructor,
    );
    if (handlers) {
      handlers.forEach((handler) => {
        handler(event);
      });
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
