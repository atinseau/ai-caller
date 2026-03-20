import { inject, injectable } from "inversify";
import type { IPhoneNumberModel } from "@/domain/models/phone-number.model.ts";
import type { PhoneNumberRepositoryPort } from "@/domain/repositories/phone-number-repository.port.ts";
import type { PrismaClient } from "@/generated/prisma/client";
import { PhoneNumberMapper } from "../mappers/phone-number.mapper.ts";
import { PRISMA_TOKEN } from "../prisma.ts";

@injectable()
export class PhoneNumberRepositoryPrisma implements PhoneNumberRepositoryPort {
  constructor(@inject(PRISMA_TOKEN) private readonly prisma: PrismaClient) {}

  async findByPhoneNumber(
    phoneNumber: string,
  ): Promise<IPhoneNumberModel | null> {
    const record = await this.prisma.phoneNumber.findUnique({
      where: { phoneNumber },
    });
    if (!record) return null;
    return PhoneNumberMapper.toModel(record);
  }

  async findByCompanyId(companyId: string): Promise<IPhoneNumberModel | null> {
    const record = await this.prisma.phoneNumber.findUnique({
      where: { companyId },
    });
    if (!record) return null;
    return PhoneNumberMapper.toModel(record);
  }

  async create(
    companyId: string,
    phoneNumber: string,
    twilioSid: string,
  ): Promise<IPhoneNumberModel> {
    const record = await this.prisma.phoneNumber.create({
      data: PhoneNumberMapper.toEntity(companyId, phoneNumber, twilioSid),
    });
    return PhoneNumberMapper.toModel(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.phoneNumber.delete({ where: { id } });
  }
}
