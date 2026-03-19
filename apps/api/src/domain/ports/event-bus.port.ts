import type { Class } from "@/types.ts";

export type EventHandler<TEvent extends Class> = (
  event: InstanceType<TEvent>,
) => void | Promise<void>;

export abstract class EventBusPort {
  abstract publish<TEvent extends InstanceType<Class>>(
    event: TEvent,
  ): Promise<void>;
  abstract subscribe<TEvent extends Class>(
    event: TEvent,
    handler: EventHandler<TEvent>,
  ): void;
  abstract unsubscribe<TEvent extends Class>(
    event: TEvent,
    handler: EventHandler<TEvent>,
  ): void;
}
