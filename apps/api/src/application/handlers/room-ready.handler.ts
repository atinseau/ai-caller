import { inject, injectable } from "inversify";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import { EventBusPort } from "../../domain/ports/event-bus.port";
import { RealtimeGatewayPort } from "../../domain/ports/realtime-gateway.port";
import { RoomReadyEvent } from "../events/room-ready.event";

@injectable()
export class RoomReadyHandler {
  constructor(
    @inject(RoomRepositoryPort)
    private readonly roomRepository: RoomRepositoryPort,
    @inject(CompanyRepositoryPort)
    private readonly companyRepository: CompanyRepositoryPort,
    @inject(EventBusPort) private readonly eventBus: EventBusPort,
    @inject(RealtimeGatewayPort)
    private readonly realtimeGateway: RealtimeGatewayPort,
  ) {
    this.eventBus.subscribe(RoomReadyEvent, this.handle.bind(this));
  }

  private async handle(event: RoomReadyEvent) {
    const room = await this.roomRepository.findById(event.roomId);
    const company = await this.companyRepository.findById(room.companyId);
    await this.realtimeGateway.openRoomChannel(room, company?.mcpUrl);
  }
}
