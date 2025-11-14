import { Container } from "inversify";
import { repositoryModule } from "./modules/repository.module";
import { useCaseModule } from "./modules/use-case.module";

export const container = new Container()

await container.load(
  repositoryModule,
  useCaseModule
)
