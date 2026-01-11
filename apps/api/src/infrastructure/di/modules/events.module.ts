import { ContainerModule } from "inversify";
import { RoomReadyHandler } from "@/application/handlers/room-ready.handler";
import { EventBusPort } from "@/application/ports/event-bus.port";
import { InMemoryEventBus } from "@/infrastructure/event-bus/in-memory-event-bus";

export const HANDLERS = [RoomReadyHandler];

export const eventsModule = new ContainerModule((module) => {
  module.bind(EventBusPort).to(InMemoryEventBus).inSingletonScope();

  // Handlers
  for (const handler of HANDLERS) {
    module.bind(handler).toSelf().inSingletonScope();
  }
});
