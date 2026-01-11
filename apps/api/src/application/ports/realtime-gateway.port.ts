import type { IRoomModel } from "@/domain/models/room.model";

export abstract class RealtimeGatewayPort {
  abstract openRoomChannel(room: IRoomModel): void | Promise<void>;
}
