import { inject, injectable } from "inversify";
import type { IWhatsAppConfigModel } from "@/domain/models/whatsapp-config.model.ts";
import type { WhatsAppConfigRepositoryPort } from "@/domain/repositories/whatsapp-config-repository.port.ts";
import type { PrismaClient } from "@/generated/prisma/client";
import { WhatsAppConfigMapper } from "../mappers/whatsapp-config.mapper.ts";
import { PRISMA_TOKEN } from "../prisma.ts";

@injectable()
export class WhatsAppConfigRepositoryPrisma
  implements WhatsAppConfigRepositoryPort
{
  constructor(@inject(PRISMA_TOKEN) private readonly prisma: PrismaClient) {}

  async findByCompanyId(
    companyId: string,
  ): Promise<IWhatsAppConfigModel | null> {
    const record = await this.prisma.whatsAppConfig.findUnique({
      where: { companyId },
    });
    if (!record) return null;
    return WhatsAppConfigMapper.toModel(record);
  }

  async findByPhoneNumberId(
    phoneNumberId: string,
  ): Promise<IWhatsAppConfigModel | null> {
    const record = await this.prisma.whatsAppConfig.findUnique({
      where: { phoneNumberId },
    });
    if (!record) return null;
    return WhatsAppConfigMapper.toModel(record);
  }

  async create(
    companyId: string,
    phoneNumberId: string,
  ): Promise<IWhatsAppConfigModel> {
    const record = await this.prisma.whatsAppConfig.create({
      data: WhatsAppConfigMapper.toEntity(companyId, phoneNumberId),
    });
    return WhatsAppConfigMapper.toModel(record);
  }

  async update(
    id: string,
    data: Partial<Pick<IWhatsAppConfigModel, "phoneNumberId" | "active">>,
  ): Promise<IWhatsAppConfigModel> {
    const record = await this.prisma.whatsAppConfig.update({
      where: { id },
      data,
    });
    return WhatsAppConfigMapper.toModel(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.whatsAppConfig.delete({ where: { id } });
  }
}
