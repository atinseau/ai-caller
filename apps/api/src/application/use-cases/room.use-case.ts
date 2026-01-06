import { inject, injectable } from "inversify";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import { CallServicePort } from "@/domain/services/call-service.port";
import { prisma } from "@/infrastructure/database/prisma";
import { logger } from "@/infrastructure/logger";
import type { IAttachCallToRoomDto } from "@/interfaces/dtos/attach-call-to-room.dto";
import type { ICreateRoomParamsDto } from "@/interfaces/dtos/create-room-params.dto";

@injectable()
export class RoomUseCase {
  constructor(
    @inject(CallServicePort) private callService: CallServicePort,
    @inject(CompanyRepositoryPort) private companyRepository: CompanyRepositoryPort,
    @inject(RoomRepositoryPort) private roomRepository: RoomRepositoryPort
  ) { }

  async createRoom(createRoomParamsDto: ICreateRoomParamsDto) {
    const company = await this.companyRepository.findById(createRoomParamsDto.companyId)
    if (!company) {
      throw new Error('Company not found')
    }

    const { expiresAt, token } = await this.callService.createCall(company)
    const room = await this.roomRepository.createRoom(createRoomParamsDto.companyId, token, expiresAt)
    logger.info(`Room created with ID: ${room.id} for Company ID: ${createRoomParamsDto.companyId}`)
    return room
  }

  async attachCallToRoom(attachCallToRoom: IAttachCallToRoomDto) {
    await this.roomRepository.updateRoomCallId(attachCallToRoom.roomId, attachCallToRoom.id)
    logger.info(`Call with ID: ${attachCallToRoom.id} attached to Room ID: ${attachCallToRoom.roomId}`)
  }

  async flushExpiredRooms() {
    const expiredRooms = await this.roomRepository.findExpiredRooms()
    console.log(expiredRooms)
  }

}
