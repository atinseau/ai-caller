import { CompanyUseCase } from "@/application/company.use-case"
import { ContainerModule } from "inversify"

export const useCaseModule = new ContainerModule((module) => {
  module.bind(CompanyUseCase).toSelf().inSingletonScope()
})
