import type { IContactModel } from "../models/contact.model.ts";

export type ContactIdentifiers = {
  phoneNumber?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
};

export abstract class ContactRepositoryPort {
  abstract findByIdentifiers(
    companyId: string,
    identifiers: ContactIdentifiers,
  ): Promise<IContactModel | null>;

  abstract create(
    data: {
      companyId: string;
    } & ContactIdentifiers,
  ): Promise<IContactModel>;

  abstract updateSummary(
    contactId: string,
    summary: string,
  ): Promise<IContactModel>;

  abstract findById(contactId: string): Promise<IContactModel | null>;
}
