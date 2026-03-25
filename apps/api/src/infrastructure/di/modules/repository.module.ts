import { ContainerModule } from "inversify";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port.ts";
import { ContactRepositoryPort } from "@/domain/repositories/contact-repository.port.ts";
import { PhoneNumberRepositoryPort } from "@/domain/repositories/phone-number-repository.port.ts";
import { RoomEventRepositoryPort } from "@/domain/repositories/room-event-repository.port.ts";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port.ts";
import { ToolRepositoryPort } from "@/domain/repositories/tool-repository.port.ts";
import { WhatsAppConfigRepositoryPort } from "@/domain/repositories/whatsapp-config-repository.port.ts";
import { PRISMA_TOKEN, prisma } from "@/infrastructure/database/prisma.ts";
import { CompanyRepositoryPrisma } from "@/infrastructure/database/repositories/company-repository.prisma.ts";
import { ContactRepositoryPrisma } from "@/infrastructure/database/repositories/contact-repository.prisma.ts";
import { PhoneNumberRepositoryPrisma } from "@/infrastructure/database/repositories/phone-number-repository.prisma.ts";
import { RoomEventRepositoryPrisma } from "@/infrastructure/database/repositories/room-event-repository.prisma.ts";
import { RoomRepositoryPrisma } from "@/infrastructure/database/repositories/room-repository.prisma.ts";
import { ToolRepositoryPrisma } from "@/infrastructure/database/repositories/tool-repository.prisma.ts";
import { WhatsAppConfigRepositoryPrisma } from "@/infrastructure/database/repositories/whatsapp-config-repository.prisma.ts";

export const repositoryModule = new ContainerModule((module) => {
  module.bind(PRISMA_TOKEN).toConstantValue(prisma);
  module
    .bind(CompanyRepositoryPort)
    .to(CompanyRepositoryPrisma)
    .inSingletonScope();
  module.bind(RoomRepositoryPort).to(RoomRepositoryPrisma).inSingletonScope();
  module.bind(ToolRepositoryPort).to(ToolRepositoryPrisma).inSingletonScope();
  module
    .bind(RoomEventRepositoryPort)
    .to(RoomEventRepositoryPrisma)
    .inSingletonScope();
  module
    .bind(PhoneNumberRepositoryPort)
    .to(PhoneNumberRepositoryPrisma)
    .inSingletonScope();
  module
    .bind(WhatsAppConfigRepositoryPort)
    .to(WhatsAppConfigRepositoryPrisma)
    .inSingletonScope();
  module
    .bind(ContactRepositoryPort)
    .to(ContactRepositoryPrisma)
    .inSingletonScope();
});
