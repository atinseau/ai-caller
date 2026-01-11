import { inject, injectable } from "inversify";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import { RoomReadyEvent } from "../events/room-ready.event";
import { EventBusPort } from "../ports/event-bus.port";
import { RealtimeGatewayPort } from "../ports/realtime-gateway.port";

@injectable()
export class RoomReadyHandler {
  constructor(
    @inject(RoomRepositoryPort)
    private readonly roomRepository: RoomRepositoryPort,
    @inject(EventBusPort) private readonly eventBus: EventBusPort,
    @inject(RealtimeGatewayPort)
    private readonly realtimeGateway: RealtimeGatewayPort,
  ) {
    this.eventBus.subscribe(RoomReadyEvent, this.handle.bind(this));
  }

  private async handle(event: RoomReadyEvent) {
    const room = await this.roomRepository.findById(event.roomId);
    await this.realtimeGateway.openRoomChannel(room);
  }
}
