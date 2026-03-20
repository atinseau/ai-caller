import { HTTPException } from "hono/http-exception";
import { inject, injectable } from "inversify";
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
  ) {}

  /**
   * Handle an incoming telephony call.
   * Called when the Twilio Media Streams WebSocket sends the "start" event.
   */
  async handleIncomingCall(
    companyId: string,
    streamSid: string,
    sendToTwilio: (message: Record<string, unknown>) => void,
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

    // Build session config (same as WebRTC but without clientSecrets)
    const sessionConfig = await this.callService.buildSessionConfig(
      company,
      "AUDIO",
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

    // Wire up the telephony gateway (OpenAI WS bridge)
    await this.telephonyGateway.initCall(
      room.id,
      company,
      sessionConfig,
      sendToTwilio,
      company.mcpUrl ?? undefined,
      false,
    );

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
