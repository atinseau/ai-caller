import { randomUUIDv7 } from "bun";
import type { IPhoneNumberModel } from "@/domain/models/phone-number.model.ts";
import type { PhoneNumber } from "@/generated/prisma/client";

export abstract class PhoneNumberMapper {
  static toModel(prisma: PhoneNumber): IPhoneNumberModel {
    return {
      id: prisma.id,
      phoneNumber: prisma.phoneNumber,
      twilioSid: prisma.twilioSid,
      companyId: prisma.companyId,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    };
  }

  static toEntity(
    companyId: string,
    phoneNumber: string,
    twilioSid: string,
  ): PhoneNumber {
    return {
      id: randomUUIDv7(),
      phoneNumber,
      twilioSid,
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
