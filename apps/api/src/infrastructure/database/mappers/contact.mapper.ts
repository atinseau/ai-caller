import { randomUUIDv7 } from "bun";
import type { IContactModel } from "@/domain/models/contact.model.ts";
import type { ContactIdentifiers } from "@/domain/repositories/contact-repository.port.ts";
import type { Contact } from "@/generated/prisma/client";

export abstract class ContactMapper {
  static toModel(prisma: Contact): IContactModel {
    return {
      id: prisma.id,
      companyId: prisma.companyId,
      phoneNumber: prisma.phoneNumber,
      email: prisma.email,
      ipAddress: prisma.ipAddress,
      userAgent: prisma.userAgent,
      summary: prisma.summary,
      metadata: prisma.metadata as Record<string, unknown> | null,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    };
  }

  static toEntity(companyId: string, identifiers: ContactIdentifiers): Contact {
    return {
      id: randomUUIDv7(),
      companyId,
      phoneNumber: identifiers.phoneNumber ?? null,
      email: identifiers.email ?? null,
      ipAddress: identifiers.ipAddress ?? null,
      userAgent: identifiers.userAgent ?? null,
      summary: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
