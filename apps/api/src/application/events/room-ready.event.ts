import type { IRoomModel } from "@/domain/models/room.model";

export class RoomReadyEvent {
  public readonly roomId: string;

  constructor(roomModel: IRoomModel) {
    this.roomId = roomModel.id;
  }
}
