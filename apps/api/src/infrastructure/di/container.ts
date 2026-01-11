import { Container } from "inversify";
import { eventsModule, HANDLERS } from "./modules/events.module";
import { gatewayModule } from "./modules/gateway.module";
import { repositoryModule } from "./modules/repository.module";
import { serviceModule } from "./modules/service.module";
import { useCaseModule } from "./modules/use-case.module";

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
