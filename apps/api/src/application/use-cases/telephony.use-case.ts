import { HTTPException } from "hono/http-exception";
import { inject, injectable } from "inversify";
import { ContactService } from "@/application/services/contact.service.ts";
import { CompanyStatus } from "@/domain/enums/company-status.enum.ts";
import { RoomSource } from "@/domain/enums/room-source.enum.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { TelephonyGatewayPort } from "@/domain/ports/telephony-gateway.port.ts";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port.ts";
import { PhoneNumberRepositoryPort } from "@/domain/repositories/phone-number-repository.port.ts";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port.ts";
import { CallServicePort } from "@/domain/services/call-service.port.ts";

@injectable()
export class TelephonyUseCase {
  constructor(
    @inject(PhoneNumberRepositoryPort)
    private readonly phoneNumberRepo: PhoneNumberRepositoryPort,
    @inject(CompanyRepositoryPort)
    private readonly companyRepo: CompanyRepositoryPort,
    @inject(RoomRepositoryPort)
    private readonly roomRepo: RoomRepositoryPort,
    @inject(CallServicePort)
    private readonly callService: CallServicePort,
    @inject(TelephonyGatewayPort)
    private readonly telephonyGateway: TelephonyGatewayPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
    @inject(ContactService) private readonly contactService: ContactService,
  ) {}

  /**
   * Handle an incoming telephony call.
   * Called when the Twilio Media Streams WebSocket sends the "start" event.
   */
  async handleIncomingCall(
    companyId: string,
    streamSid: string,
    sendToTwilio: (message: Record<string, unknown>) => void,
    callerNumber?: string,
  ): Promise<string> {
    const company = await this.companyRepo.findById(companyId);
    if (!company) {
      throw new HTTPException(404, {
        message: "Company not found for incoming call",
      });
    }

    if (company.status !== CompanyStatus.ACTIVE) {
      throw new HTTPException(400, {
        message: "Company is not active — cannot handle calls",
      });
    }

    this.logger.info(
      `[Telephony] Incoming call for company ${company.name} (${companyId})`,
    );

    // Resolve contact from caller number
    let contact: { id: string; summary?: string | null } | undefined;
    if (callerNumber) {
      contact = await this.contactService.findOrCreate(companyId, {
        phoneNumber: callerNumber,
      });
    }

    // Build normalized audio provider config
    const config = await this.callService.buildAudioProviderConfig(
      company,
      contact?.summary ?? undefined,
    );

    // Create a telephony room (no ephemeral token needed — we use API key)
    const room = await this.roomRepo.createRoom(
      companyId,
      "telephony", // placeholder token — telephony uses API key auth
      undefined, // expiresAt handled by call duration
      "AUDIO",
      false,
      RoomSource.TELEPHONY,
    );

    // Store the streamSid on the room
    await this.roomRepo.updateTwilioStreamSid(room.id, streamSid);

    // Link contact to room
    if (contact) {
      await this.contactService.linkToRoom(contact.id, room.id);
    }

    // Wire up the telephony gateway (audio provider bridge)
    await this.telephonyGateway.initCall(room.id, config, sendToTwilio);

    this.logger.info(
      `[Telephony] Room ${room.id} created for company ${company.name}`,
    );

    return room.id;
  }

  /**
   * Look up which company a phone number belongs to.
   */
  async findCompanyByPhoneNumber(phoneNumber: string): Promise<string | null> {
    const record = await this.phoneNumberRepo.findByPhoneNumber(phoneNumber);
    return record?.companyId ?? null;
  }
}
