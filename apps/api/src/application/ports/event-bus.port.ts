import type { Class } from "@/types";

export type EventHandler<TEvent extends Class> = (
  event: InstanceType<TEvent>,
) => void;

export abstract class EventBusPort {
  abstract publish<TEvent extends InstanceType<Class>>(event: TEvent): void;
  abstract subscribe<TEvent extends Class>(
    event: TEvent,
    handler: EventHandler<TEvent>,
  ): void;
  abstract unsubscribe<TEvent extends Class>(
    event: TEvent,
    handler: EventHandler<TEvent>,
  ): void;
}
