import { HTTPException } from "hono/http-exception";
import { inject, injectable } from "inversify";
import type { IPhoneNumberModel } from "@/domain/models/phone-number.model.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { TwilioClientPort } from "@/domain/ports/twilio-client.port.ts";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port.ts";
import { PhoneNumberRepositoryPort } from "@/domain/repositories/phone-number-repository.port.ts";
import { env } from "@/infrastructure/config/env.ts";

@injectable()
export class PhoneNumberUseCase {
  constructor(
    @inject(PhoneNumberRepositoryPort)
    private readonly phoneNumberRepo: PhoneNumberRepositoryPort,
    @inject(CompanyRepositoryPort)
    private readonly companyRepo: CompanyRepositoryPort,
    @inject(TwilioClientPort)
    private readonly twilioClient: TwilioClientPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
  ) {}

  async provision(
    companyId: string,
    country: string,
    areaCode?: string,
  ): Promise<IPhoneNumberModel> {
    const company = await this.companyRepo.findById(companyId);
    if (!company) {
      throw new HTTPException(404, { message: "Company not found" });
    }

    const existing = await this.phoneNumberRepo.findByCompanyId(companyId);
    if (existing) {
      throw new HTTPException(400, {
        message: "Company already has a phone number assigned",
      });
    }

    const { phoneNumber, sid } = await this.twilioClient.purchasePhoneNumber(
      country,
      areaCode,
    );

    const webhookBaseUrl = env.get("TWILIO_WEBHOOK_BASE_URL");
    if (webhookBaseUrl) {
      await this.twilioClient.configureWebhook(
        sid,
        `${webhookBaseUrl}/api/telephony/incoming`,
      );
    }

    const record = await this.phoneNumberRepo.create(
      companyId,
      phoneNumber,
      sid,
    );

    this.logger.info(
      `[Telephony] Provisioned ${phoneNumber} for company ${company.name}`,
    );

    return record;
  }

  async release(companyId: string): Promise<void> {
    const record = await this.phoneNumberRepo.findByCompanyId(companyId);
    if (!record) {
      throw new HTTPException(404, {
        message: "No phone number found for this company",
      });
    }

    await this.twilioClient.releasePhoneNumber(record.twilioSid);
    await this.phoneNumberRepo.delete(record.id);

    this.logger.info(
      `[Telephony] Released ${record.phoneNumber} for company ${companyId}`,
    );
  }

  getByCompany(companyId: string): Promise<IPhoneNumberModel | null> {
    return this.phoneNumberRepo.findByCompanyId(companyId);
  }
}
