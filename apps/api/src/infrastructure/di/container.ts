import { Container } from "inversify";
import { eventsModule, HANDLERS } from "./modules/events.module.ts";
import { gatewayModule } from "./modules/gateway.module.ts";
import { repositoryModule } from "./modules/repository.module.ts";
import { serviceModule } from "./modules/service.module.ts";
import { useCaseModule } from "./modules/use-case.module.ts";

export const container = new Container();

await container.load(
  repositoryModule,
  useCaseModule,
  serviceModule,
  eventsModule,
  gatewayModule,
);

// Eagerly resolve all event handlers to register them
for (const handlerIdentifier of HANDLERS) {
  container.get(handlerIdentifier);
}
