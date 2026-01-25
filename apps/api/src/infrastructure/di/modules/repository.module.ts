import { ContainerModule } from "inversify";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import { ToolRepositoryPort } from "@/domain/repositories/tool-repository.port";
import { CompanyRepositoryPrisma } from "@/infrastructure/database/repositories/company-repository.prisma";
import { RoomRepositoryPrisma } from "@/infrastructure/database/repositories/room-repository.prisma";
import { ToolRepositoryPrisma } from "@/infrastructure/database/repositories/tool-repository.prisma";

export const repositoryModule = new ContainerModule((module) => {
  module
    .bind(CompanyRepositoryPort)
    .to(CompanyRepositoryPrisma)
    .inSingletonScope();
  module.bind(RoomRepositoryPort).to(RoomRepositoryPrisma).inSingletonScope();
  module.bind(ToolRepositoryPort).to(ToolRepositoryPrisma).inSingletonScope();
});
