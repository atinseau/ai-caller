import { ContainerModule } from "inversify";
import { CompanyUseCase } from "@/application/use-cases/company.use-case";
import { RoomUseCase } from "@/application/use-cases/room.use-case";

export const useCaseModule = new ContainerModule((module) => {
  module.bind(CompanyUseCase).toSelf().inSingletonScope();
  module.bind(RoomUseCase).toSelf().inSingletonScope();
});
