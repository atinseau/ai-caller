import { CompanyUseCase } from "@/application/use-cases/company.use-case"
import { RoomUseCase } from "@/application/use-cases/room.use-case"
import { ContainerModule } from "inversify"

export const useCaseModule = new ContainerModule((module) => {
  module.bind(CompanyUseCase).toSelf().inSingletonScope()
  module.bind(RoomUseCase).toSelf().inSingletonScope()
})
