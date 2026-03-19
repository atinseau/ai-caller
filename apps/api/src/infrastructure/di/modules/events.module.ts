import { ContainerModule } from "inversify";
import { RoomReadyHandler } from "@/application/handlers/room-ready.handler.ts";
import { EventBusPort } from "@/domain/ports/event-bus.port.ts";
import { InMemoryEventBus } from "@/infrastructure/event-bus/in-memory-event-bus.ts";

export const HANDLERS = [RoomReadyHandler];

export const eventsModule = new ContainerModule((module) => {
  module.bind(EventBusPort).to(InMemoryEventBus).inSingletonScope();

  // Handlers
  for (const handler of HANDLERS) {
    module.bind(handler).toSelf().inSingletonScope();
  }
});
