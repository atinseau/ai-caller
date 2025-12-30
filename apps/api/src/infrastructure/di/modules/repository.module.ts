import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port"
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port"
import { CompanyRepositoryPrisma } from "@/infrastructure/database/repositories/company-repository.prisma"
import { RoomRepositoryPrisma } from "@/infrastructure/database/repositories/room-repository.prisma"
import { ContainerModule } from "inversify"

export const repositoryModule = new ContainerModule((module) => {
  module.bind(CompanyRepositoryPort).to(CompanyRepositoryPrisma).inSingletonScope()
  module.bind(RoomRepositoryPort).to(RoomRepositoryPrisma).inSingletonScope()
})
