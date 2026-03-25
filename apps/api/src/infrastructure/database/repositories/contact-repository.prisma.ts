import { inject, injectable } from "inversify";
import type { IContactModel } from "@/domain/models/contact.model.ts";
import type {
  ContactIdentifiers,
  ContactRepositoryPort,
} from "@/domain/repositories/contact-repository.port.ts";
import type { PrismaClient } from "@/generated/prisma/client";
import { ContactMapper } from "../mappers/contact.mapper.ts";
import { PRISMA_TOKEN } from "../prisma.ts";

type CreateContactData = {
  companyId: string;
} & ContactIdentifiers;

@injectable()
export class ContactRepositoryPrisma implements ContactRepositoryPort {
  constructor(@inject(PRISMA_TOKEN) private readonly prisma: PrismaClient) {}

  async findByIdentifiers(
    companyId: string,
    identifiers: ContactIdentifiers,
  ): Promise<IContactModel | null> {
    const orConditions: Record<string, string>[] = [];

    if (identifiers.phoneNumber) {
      orConditions.push({ phoneNumber: identifiers.phoneNumber });
    }
    if (identifiers.email) {
      orConditions.push({ email: identifiers.email });
    }
    if (identifiers.ipAddress) {
      orConditions.push({ ipAddress: identifiers.ipAddress });
    }

    if (orConditions.length === 0) return null;

    const record = await this.prisma.contact.findFirst({
      where: {
        companyId,
        OR: orConditions,
      },
    });

    if (!record) return null;
    return ContactMapper.toModel(record);
  }

  async create(data: CreateContactData): Promise<IContactModel> {
    const entity = ContactMapper.toEntity(data.companyId, data);
    const record = await this.prisma.contact.create({
      data: {
        id: entity.id,
        companyId: entity.companyId,
        phoneNumber: entity.phoneNumber,
        email: entity.email,
        ipAddress: entity.ipAddress,
        userAgent: entity.userAgent,
      },
    });
    return ContactMapper.toModel(record);
  }

  async updateSummary(
    contactId: string,
    summary: string,
  ): Promise<IContactModel> {
    const record = await this.prisma.contact.update({
      where: { id: contactId },
      data: { summary },
    });
    return ContactMapper.toModel(record);
  }

  async findById(contactId: string): Promise<IContactModel | null> {
    const record = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });
    if (!record) return null;
    return ContactMapper.toModel(record);
  }
}
