import { inject, injectable } from "inversify";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port.ts";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port.ts";
import { EventBusPort } from "../../domain/ports/event-bus.port.ts";
import { RealtimeGatewayPort } from "../../domain/ports/realtime-gateway.port.ts";
import { RoomReadyEvent } from "../events/room-ready.event.ts";

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
    await this.realtimeGateway.openRoomChannel(
      room,
      company?.mcpUrl ?? undefined,
    );
  }
}
