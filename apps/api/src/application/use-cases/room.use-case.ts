import { inject, injectable } from "inversify";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import { CallServicePort } from "@/domain/services/call-service.port";
import { logger } from "@/infrastructure/logger";
import type { IAttachCallToRoomRequestDto } from "@/interfaces/dtos/room/attach-call-to-room-request.dto";
import type { ICreateRoomParamsRequestDto } from "@/interfaces/dtos/room/create-room-params-request.dto";

@injectable()
export class RoomUseCase {
  constructor(
    @inject(CallServicePort) private callService: CallServicePort,
    @inject(CompanyRepositoryPort)
    private companyRepository: CompanyRepositoryPort,
    @inject(RoomRepositoryPort) private roomRepository: RoomRepositoryPort,
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
    await this.roomRepository.updateRoomCallId(
      attachCallToRoom.roomId,
      attachCallToRoom.id,
    );
    logger.info(
      `Call with ID: ${attachCallToRoom.id} attached to Room ID: ${attachCallToRoom.roomId}`,
    );
  }

  async flushExpiredRooms() {
    const expiredRooms = await this.roomRepository.findExpiredRooms();
    console.log(expiredRooms);
  }
}
