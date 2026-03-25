import { inject, injectable } from "inversify";
import { RoomSource } from "@/domain/enums/room-source.enum.ts";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port.ts";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port.ts";
import { CallServicePort } from "@/domain/services/call-service.port.ts";
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
    @inject(CallServicePort)
    private readonly callService: CallServicePort,
  ) {
    this.eventBus.subscribe(RoomReadyEvent, this.handle.bind(this));
  }

  private async handle(event: RoomReadyEvent) {
    const room = await this.roomRepository.findById(event.roomId);

    // Telephony rooms are already wired by TelephonyGateway — skip
    if (room.source === RoomSource.TELEPHONY) return;

    const company = await this.companyRepository.findById(room.companyId);
    if (!company) return;

    const config = await this.callService.buildAudioProviderConfig(company);
    config.isTest = room.isTest;

    await this.realtimeGateway.openRoomChannel(room, config);
  }
}
