import type { IRoomModel } from "@/domain/models/room.model.ts";

export class RoomReadyEvent {
  public readonly roomId: string;
  public readonly modality: "AUDIO" | "TEXT";

  constructor(roomModel: IRoomModel) {
    this.roomId = roomModel.id;
    this.modality = roomModel.modality;
  }
}
