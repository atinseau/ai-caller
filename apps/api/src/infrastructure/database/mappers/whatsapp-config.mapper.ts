import { randomUUIDv7 } from "bun";
import type { IWhatsAppConfigModel } from "@/domain/models/whatsapp-config.model.ts";
import type { WhatsAppConfig } from "@/generated/prisma/client";

export abstract class WhatsAppConfigMapper {
  static toModel(prisma: WhatsAppConfig): IWhatsAppConfigModel {
    return {
      id: prisma.id,
      phoneNumberId: prisma.phoneNumberId,
      active: prisma.active,
      companyId: prisma.companyId,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    };
  }

  static toEntity(companyId: string, phoneNumberId: string): WhatsAppConfig {
    return {
      id: randomUUIDv7(),
      phoneNumberId,
      active: true,
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
