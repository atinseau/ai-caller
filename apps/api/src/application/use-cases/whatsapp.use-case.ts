import { randomUUIDv7 } from "bun";
import dayjs from "dayjs";
import { HTTPException } from "hono/http-exception";
import { inject, injectable } from "inversify";
import { ContactService } from "@/application/services/contact.service.ts";
import { CompanyStatus } from "@/domain/enums/company-status.enum.ts";
import { RoomSource } from "@/domain/enums/room-source.enum.ts";
import type { IWhatsAppConfigModel } from "@/domain/models/whatsapp-config.model.ts";
import { ChatServicePort } from "@/domain/ports/chat-service.port.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { WhatsAppClientPort } from "@/domain/ports/whatsapp-client.port.ts";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port.ts";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port.ts";
import { WhatsAppConfigRepositoryPort } from "@/domain/repositories/whatsapp-config-repository.port.ts";
import { CallServicePort } from "@/domain/services/call-service.port.ts";
import { env } from "@/infrastructure/config/env.ts";

@injectable()
export class WhatsAppUseCase {
  /** Active conversations: whatsappUserPhone → roomId */
  private readonly activeConversations: Map<string, string> = new Map();

  constructor(
    @inject(WhatsAppConfigRepositoryPort)
    private readonly configRepo: WhatsAppConfigRepositoryPort,
    @inject(CompanyRepositoryPort)
    private readonly companyRepo: CompanyRepositoryPort,
    @inject(RoomRepositoryPort)
    private readonly roomRepo: RoomRepositoryPort,
    @inject(ChatServicePort) private readonly chatService: ChatServicePort,
    @inject(CallServicePort) private readonly callService: CallServicePort,
    @inject(WhatsAppClientPort)
    private readonly whatsappClient: WhatsAppClientPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
    @inject(ContactService) private readonly contactService: ContactService,
  ) {
    // Periodic cleanup of expired WhatsApp conversations (every 5 minutes)
    setInterval(() => this.cleanupExpiredConversations(), 300_000);
  }

  private cleanupExpiredConversations(): void {
    const now = new Date();
    for (const [phone, roomId] of this.activeConversations) {
      this.roomRepo
        .findById(roomId)
        .then((room) => {
          if (!room || room.expiresAt <= now) {
            this.activeConversations.delete(phone);
          }
        })
        .catch(() => {
          this.activeConversations.delete(phone);
        });
    }
  }

  /**
   * Handle an incoming WhatsApp message from the Meta webhook.
   */
  async handleIncomingMessage(
    phoneNumberId: string,
    from: string,
    text: string,
    messageId: string,
  ): Promise<void> {
    const config = await this.configRepo.findByPhoneNumberId(phoneNumberId);
    if (!config || !config.active) {
      this.logger.warn(
        `No active WhatsApp config for phoneNumberId ${phoneNumberId}`,
      );
      return;
    }

    const company = await this.companyRepo.findById(config.companyId);
    if (!company || company.status !== CompanyStatus.ACTIVE) {
      this.logger.warn(
        `Company ${config.companyId} is not active for WhatsApp`,
      );
      return;
    }

    // Mark message as read
    await this.whatsappClient.markRead(phoneNumberId, messageId).catch(() => {
      /* intentionally ignored */
    });

    // Find or create room for this conversation
    const roomId = await this.getOrCreateRoom(from, config, company);

    // Send message through ChatService and relay responses to WhatsApp
    await this.processAndReply(roomId, text, from, config);
  }

  /**
   * Start an outbound WhatsApp conversation (trigger).
   */
  async startConversation(
    companyId: string,
    toNumber: string,
    initialMessage?: string,
  ): Promise<string> {
    const config = await this.configRepo.findByCompanyId(companyId);
    if (!config || !config.active) {
      throw new HTTPException(400, {
        message: "WhatsApp is not configured or not active for this company",
      });
    }

    const company = await this.companyRepo.findById(companyId);
    if (!company || company.status !== CompanyStatus.ACTIVE) {
      throw new HTTPException(400, {
        message: "Company is not active",
      });
    }

    const roomId = await this.getOrCreateRoom(toNumber, config, company);

    if (initialMessage) {
      await this.processAndReply(roomId, initialMessage, toNumber, config);
    }

    return roomId;
  }

  /**
   * Configure WhatsApp for a company.
   */
  async configure(
    companyId: string,
    phoneNumberId: string,
  ): Promise<IWhatsAppConfigModel> {
    const existing = await this.configRepo.findByCompanyId(companyId);
    if (existing) {
      throw new HTTPException(409, {
        message: "WhatsApp is already configured for this company",
      });
    }

    return this.configRepo.create(companyId, phoneNumberId);
  }

  /**
   * Update WhatsApp config.
   */
  async updateConfig(
    companyId: string,
    data: Partial<Pick<IWhatsAppConfigModel, "phoneNumberId" | "active">>,
  ): Promise<IWhatsAppConfigModel> {
    const config = await this.configRepo.findByCompanyId(companyId);
    if (!config) {
      throw new HTTPException(404, {
        message: "WhatsApp config not found",
      });
    }
    return this.configRepo.update(config.id, data);
  }

  /**
   * Delete WhatsApp config.
   */
  async deleteConfig(companyId: string): Promise<void> {
    const config = await this.configRepo.findByCompanyId(companyId);
    if (!config) {
      throw new HTTPException(404, {
        message: "WhatsApp config not found",
      });
    }
    await this.configRepo.delete(config.id);
  }

  /**
   * Get WhatsApp config for a company.
   */
  getConfig(companyId: string): Promise<IWhatsAppConfigModel | null> {
    return this.configRepo.findByCompanyId(companyId);
  }

  /**
   * Verify webhook token (Meta sends GET to verify).
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode !== "subscribe") return null;

    if (token !== env.get("WHATSAPP_VERIFY_TOKEN")) return null;

    return challenge;
  }

  private async getOrCreateRoom(
    whatsappPhone: string,
    config: IWhatsAppConfigModel,
    company: Record<string, unknown> & {
      id: string;
      mcpUrl?: string | null;
    },
  ): Promise<string> {
    const existingRoomId = this.activeConversations.get(whatsappPhone);
    if (existingRoomId) {
      // Check room still exists and not expired
      try {
        const room = await this.roomRepo.findById(existingRoomId);
        if (room && room.expiresAt > new Date()) {
          return existingRoomId;
        }
      } catch {
        /* Room expired or deleted — create new one */
      }
      this.activeConversations.delete(whatsappPhone);
    }

    const expiresAt = dayjs()
      .add(env.get("ROOM_CALL_DURATION_MINUTE"), "minute")
      .toDate();

    const room = await this.roomRepo.createRoom(
      config.companyId,
      `whatsapp-${randomUUIDv7()}`,
      expiresAt,
      "TEXT",
      false,
      RoomSource.WHATSAPP,
    );

    // Resolve contact from WhatsApp phone number
    const contact = await this.contactService.findOrCreate(config.companyId, {
      phoneNumber: whatsappPhone,
    });

    await this.contactService.linkToRoom(contact.id, room.id);

    // Build session config for tools and instructions
    const sessionConfig = await this.callService.buildSessionConfig(
      company as Parameters<CallServicePort["buildSessionConfig"]>[0],
      "TEXT",
      contact.summary ?? undefined,
    );

    const instructions = (sessionConfig.instructions as string) ?? "";
    const tools = (sessionConfig.tools ?? []) as Parameters<
      ChatServicePort["initSession"]
    >[2];

    this.chatService.initSession(
      room.id,
      instructions,
      tools,
      company.mcpUrl ?? undefined,
      false,
    );

    this.activeConversations.set(whatsappPhone, room.id);

    this.logger.info(
      `WhatsApp room ${room.id} created for ${whatsappPhone} (company ${config.companyId})`,
    );

    return room.id;
  }

  private async processAndReply(
    roomId: string,
    text: string,
    toNumber: string,
    config: IWhatsAppConfigModel,
  ): Promise<void> {
    let fullResponse = "";

    for await (const event of this.chatService.sendMessage(roomId, text)) {
      if (event.type === "text_done") {
        fullResponse = event.text;
      }
    }

    if (fullResponse) {
      await this.whatsappClient.sendMessage(
        config.phoneNumberId,
        toNumber,
        fullResponse,
      );
    }
  }
}
