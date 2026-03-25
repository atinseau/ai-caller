import dayjs from "dayjs";
import { inject, injectable } from "inversify";
import { ContactService } from "@/application/services/contact.service.ts";
import { ChatServicePort } from "@/domain/ports/chat-service.port.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port.ts";
import type { ContactIdentifiers } from "@/domain/repositories/contact-repository.port.ts";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port.ts";
import { CallServicePort } from "@/domain/services/call-service.port.ts";
import { env } from "@/infrastructure/config/env.ts";
import type { IAttachCallToRoomRequestDto } from "@/interfaces/dtos/room/attach-call-to-room-request.dto.ts";
import type { ICreateRoomParamsRequestDto } from "@/interfaces/dtos/room/create-room-params-request.dto.ts";
import { EventBusPort } from "../../domain/ports/event-bus.port.ts";
import { RoomReadyEvent } from "../events/room-ready.event.ts";

@injectable()
export class RoomUseCase {
  constructor(
    @inject(CallServicePort) private readonly callService: CallServicePort,
    @inject(CompanyRepositoryPort)
    private readonly companyRepository: CompanyRepositoryPort,
    @inject(RoomRepositoryPort)
    private readonly roomRepository: RoomRepositoryPort,
    @inject(EventBusPort) private readonly eventBus: EventBusPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
    @inject(ChatServicePort) private readonly chatService: ChatServicePort,
    @inject(ContactService) private readonly contactService: ContactService,
  ) {}

  async createRoom(
    createRoomParamsDto: ICreateRoomParamsRequestDto,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ) {
    const company = await this.companyRepository.findById(
      createRoomParamsDto.companyId,
    );
    if (!company) {
      throw new Error("Company not found");
    }

    const isTest = createRoomParamsDto.isTest ?? false;
    const modality = createRoomParamsDto.modality ?? "AUDIO";

    // Start contact resolution in parallel (does not block room creation for AUDIO)
    const contactPromise =
      !isTest && clientInfo
        ? this.contactService.findOrCreate(createRoomParamsDto.companyId, {
            ipAddress: clientInfo.ipAddress,
            userAgent: clientInfo.userAgent,
          } as ContactIdentifiers)
        : Promise.resolve(undefined);

    let room: Awaited<ReturnType<typeof this.createTextRoom>>;
    if (modality === "TEXT") {
      // TEXT rooms need contactSummary in prompt — must await contact
      const contact = await contactPromise;
      room = await this.createTextRoom(
        createRoomParamsDto,
        company,
        contact?.summary ?? undefined,
      );
      if (contact) {
        // Fire-and-forget: linking doesn't need to block response
        this.contactService
          .linkToRoom(contact.id, room.id)
          .catch((err) =>
            this.logger.error(
              err as object,
              `Failed to link contact to room ${room.id}`,
            ),
          );
      }
    } else {
      // AUDIO rooms: create room immediately, contact links in background
      room = await this.createAudioRoom(createRoomParamsDto, company, modality);
      contactPromise
        .then((contact) => {
          if (contact) {
            return this.contactService.linkToRoom(contact.id, room.id);
          }
        })
        .catch((err) =>
          this.logger.error(
            err as object,
            `Failed to resolve/link contact for room ${room.id}`,
          ),
        );
    }

    return room;
  }

  async attachCallToRoom(attachCallToRoom: IAttachCallToRoomRequestDto) {
    const roomModel = await this.roomRepository.updateRoomCallId(
      attachCallToRoom.roomId,
      attachCallToRoom.id,
    );
    if (!roomModel) {
      throw new Error("Room not found");
    }
    await this.eventBus.publish(new RoomReadyEvent(roomModel));
    this.logger.info(
      `Call with ID: ${attachCallToRoom.id} attached to Room ID: ${attachCallToRoom.roomId}`,
    );
  }

  async flushExpiredRooms() {
    const expiredRooms = await this.roomRepository.findExpiredRooms();
    const results = await Promise.allSettled(
      expiredRooms.map((expiredRoom) =>
        this.callService.terminateCall(expiredRoom),
      ),
    );

    let fullyfied = 0;
    for (const result of results) {
      if (result.status === "rejected") {
        this.logger.error(result.reason, "Failed to flush expired room");
      } else {
        fullyfied++;
      }
    }

    if (fullyfied > 0) {
      this.logger.info(`Expired rooms flushed: ${fullyfied}`);
    }
  }

  private async createTextRoom(
    dto: ICreateRoomParamsRequestDto,
    company: { id: string; name: string; mcpUrl?: string | null } & Record<
      string,
      unknown
    >,
    contactSummary?: string,
  ) {
    // TEXT rooms use Chat Completions — no ephemeral token needed
    const expiresAt = dayjs()
      .add(env.get("ROOM_CALL_DURATION_MINUTE"), "minute")
      .toDate();

    const room = await this.roomRepository.createRoom(
      dto.companyId,
      `chat-${crypto.randomUUID()}`, // placeholder token — TEXT uses API key directly
      expiresAt,
      "TEXT",
      dto.isTest ?? false,
    );

    // Build session config to extract instructions and tools
    const sessionConfig = await this.callService.buildSessionConfig(
      company as Parameters<CallServicePort["buildSessionConfig"]>[0],
      "TEXT",
      contactSummary,
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
      dto.isTest ?? false,
    );

    this.logger.info(
      `Text room created with ID: ${room.id} for Company ID: ${dto.companyId}`,
    );

    return room;
  }

  private async createAudioRoom(
    dto: ICreateRoomParamsRequestDto,
    _company: { id: string } & Record<string, unknown>,
    modality: "AUDIO" | "TEXT",
  ) {
    const expiresAt = dayjs()
      .add(env.get("ROOM_CALL_DURATION_MINUTE"), "minute")
      .toDate();

    const room = await this.roomRepository.createRoom(
      dto.companyId,
      `audio-${crypto.randomUUID()}`, // placeholder — no WebRTC ephemeral token needed
      expiresAt,
      modality,
      dto.isTest ?? false,
    );

    // Fire event immediately — backend connects to provider via WebSocket relay
    await this.eventBus.publish(new RoomReadyEvent(room));

    this.logger.info(
      `Room created with ID: ${room.id} (${modality}) for Company ID: ${dto.companyId}`,
    );

    return room;
  }
}
