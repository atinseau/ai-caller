export type RoomEventPayload = Record<string, unknown>;

export type RoomEventType =
  | "USER_TRANSCRIPT"
  | "AGENT_TRANSCRIPT"
  | "TOOL_INVOKE_CREATED"
  | "TOOL_INVOKE_UPDATED"
  | "TEXT_DELTA"
  | "TEXT_DONE";

export interface IRoomEvent {
  id: string;
  createdAt: Date;
  roomId: string;
  type: RoomEventType;
  payload: RoomEventPayload;
}

export abstract class RoomEventRepositoryPort {
  abstract create(
    roomId: string,
    type: RoomEventType,
    payload: RoomEventPayload,
  ): Promise<IRoomEvent>;

  abstract findByRoomId(roomId: string): Promise<IRoomEvent[]>;
}
