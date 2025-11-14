import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port"
import { CompanyRepositoryPrisma } from "@/infrastructure/database/repositories/company-repository.prisma"
import { ContainerModule } from "inversify"

export const repositoryModule = new ContainerModule((module) => {
  module.bind(CompanyRepositoryPort).to(CompanyRepositoryPrisma).inSingletonScope()
})
