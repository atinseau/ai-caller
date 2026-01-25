import { ContainerModule } from "inversify";
import { CallRepositoryPort } from "@/domain/repositories/call-repository.port";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import { CompanyUserRepositoryPort } from "@/domain/repositories/company-user-repository.port";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import { ToolRepositoryPort } from "@/domain/repositories/tool-repository.port";
import { CallRepositoryPrisma } from "@/infrastructure/database/repositories/call-repository.prisma";
import { CompanyRepositoryPrisma } from "@/infrastructure/database/repositories/company-repository.prisma";
import { CompanyUserRepositoryPrisma } from "@/infrastructure/database/repositories/company-user-repository.prisma";
import { RoomRepositoryPrisma } from "@/infrastructure/database/repositories/room-repository.prisma";
import { ToolRepositoryPrisma } from "@/infrastructure/database/repositories/tool-repository.prisma";

export const repositoryModule = new ContainerModule((module) => {
  module
    .bind(CompanyRepositoryPort)
    .to(CompanyRepositoryPrisma)
    .inSingletonScope();
  module
    .bind(CompanyUserRepositoryPort)
    .to(CompanyUserRepositoryPrisma)
    .inSingletonScope();
  module.bind(RoomRepositoryPort).to(RoomRepositoryPrisma).inSingletonScope();
  module.bind(CallRepositoryPort).to(CallRepositoryPrisma).inSingletonScope();
  module.bind(ToolRepositoryPort).to(ToolRepositoryPrisma).inSingletonScope();
});
