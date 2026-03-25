import type { IWhatsAppConfigModel } from "../models/whatsapp-config.model.ts";

export abstract class WhatsAppConfigRepositoryPort {
  abstract findByCompanyId(
    companyId: string,
  ): Promise<IWhatsAppConfigModel | null>;

  abstract findByPhoneNumberId(
    phoneNumberId: string,
  ): Promise<IWhatsAppConfigModel | null>;

  abstract create(
    companyId: string,
    phoneNumberId: string,
  ): Promise<IWhatsAppConfigModel>;

  abstract update(
    id: string,
    data: Partial<Pick<IWhatsAppConfigModel, "phoneNumberId" | "active">>,
  ): Promise<IWhatsAppConfigModel>;

  abstract delete(id: string): Promise<void>;
}
