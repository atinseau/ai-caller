import { inject, injectable } from "inversify";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import { CallServicePort } from "@/domain/services/call-service.port";
import { logger } from "@/infrastructure/logger";
import type { IAttachCallToRoomRequestDto } from "@/interfaces/dtos/room/attach-call-to-room-request.dto";
import type { ICreateRoomParamsRequestDto } from "@/interfaces/dtos/room/create-room-params-request.dto";
import { RoomReadyEvent } from "../events/room-ready.event";
import { EventBusPort } from "../ports/event-bus.port";

@injectable()
export class RoomUseCase {
  constructor(
    @inject(CallServicePort) private readonly callService: CallServicePort,
    @inject(CompanyRepositoryPort)
    private readonly companyRepository: CompanyRepositoryPort,
    @inject(RoomRepositoryPort)
    private readonly roomRepository: RoomRepositoryPort,
    @inject(EventBusPort) private readonly eventBus: EventBusPort,
  ) {}

  async createRoom(createRoomParamsDto: ICreateRoomParamsRequestDto) {
    const company = await this.companyRepository.findById(
      createRoomParamsDto.companyId,
    );
    if (!company) {
      throw new Error("Company not found");
    }

    const { expiresAt, token } = await this.callService.createCall(company);
    const room = await this.roomRepository.createRoom(
      createRoomParamsDto.companyId,
      token,
      expiresAt,
    );
    logger.info(
      `Room created with ID: ${room.id} for Company ID: ${createRoomParamsDto.companyId}`,
    );
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
    this.eventBus.publish(new RoomReadyEvent(roomModel));
    logger.info(
      `Call with ID: ${attachCallToRoom.id} attached to Room ID: ${attachCallToRoom.roomId}`,
    );
  }

  async flushExpiredRooms() {
    const expiredRooms = await this.roomRepository.findExpiredRooms();
    console.log(expiredRooms);
  }
}
