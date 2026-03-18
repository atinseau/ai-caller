import { ContainerModule } from "inversify";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import { RoomEventRepositoryPort } from "@/domain/repositories/room-event-repository.port";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import { ToolRepositoryPort } from "@/domain/repositories/tool-repository.port";
import { prisma, PRISMA_TOKEN } from "@/infrastructure/database/prisma";
import { CompanyRepositoryPrisma } from "@/infrastructure/database/repositories/company-repository.prisma";
import { RoomEventRepositoryPrisma } from "@/infrastructure/database/repositories/room-event-repository.prisma";
import { RoomRepositoryPrisma } from "@/infrastructure/database/repositories/room-repository.prisma";
import { ToolRepositoryPrisma } from "@/infrastructure/database/repositories/tool-repository.prisma";

export const repositoryModule = new ContainerModule((module) => {
  module.bind(PRISMA_TOKEN).toConstantValue(prisma);
  module
    .bind(CompanyRepositoryPort)
    .to(CompanyRepositoryPrisma)
    .inSingletonScope();
  module
    .bind(RoomRepositoryPort)
    .to(RoomRepositoryPrisma)
    .inSingletonScope();
  module
    .bind(ToolRepositoryPort)
    .to(ToolRepositoryPrisma)
    .inSingletonScope();
  module
    .bind(RoomEventRepositoryPort)
    .to(RoomEventRepositoryPrisma)
    .inSingletonScope();
});
