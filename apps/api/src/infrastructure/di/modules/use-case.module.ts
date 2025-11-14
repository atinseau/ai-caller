import { CreateCompanyUseCase } from "@/application/create-company.use-case"
import { ContainerModule } from "inversify"

export const useCaseModule = new ContainerModule((module) => {
  module.bind(CreateCompanyUseCase).toSelf().inSingletonScope()
})
