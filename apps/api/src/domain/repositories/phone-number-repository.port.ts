import type { IPhoneNumberModel } from "../models/phone-number.model.ts";

export abstract class PhoneNumberRepositoryPort {
  abstract findByPhoneNumber(
    phoneNumber: string,
  ): Promise<IPhoneNumberModel | null>;

  abstract findByCompanyId(
    companyId: string,
  ): Promise<IPhoneNumberModel | null>;

  abstract create(
    companyId: string,
    phoneNumber: string,
    twilioSid: string,
  ): Promise<IPhoneNumberModel>;

  abstract delete(id: string): Promise<void>;
}
