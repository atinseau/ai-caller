import type { SessionEventTypeEnum } from "@/shared/enums/session-event-type.enum";

export interface IToolInvoke {
  id: string;
  entityId: string;
  toolName?: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  args?: Record<string, unknown>;
  results?: Record<string, unknown>;
  createdAt: string;
  roomId: string;
}

export interface ITranscriptMessage {
  id: string;
  type: "user" | "agent";
  text: string;
  createdAt: Date;
}

export type SessionStreamEvent =
  | { type: SessionEventTypeEnum.TEXT_DELTA; text: string }
  | { type: SessionEventTypeEnum.TEXT_DONE; text: string }
  | { type: SessionEventTypeEnum.USER_TRANSCRIPT; text: string }
  | { type: SessionEventTypeEnum.AGENT_TRANSCRIPT_DELTA; text: string }
  | { type: SessionEventTypeEnum.AGENT_TRANSCRIPT_DONE; text: string }
  | { type: SessionEventTypeEnum.TOOL_INVOKE_CREATED; toolInvoke: IToolInvoke }
  | { type: SessionEventTypeEnum.TOOL_INVOKE_UPDATED; toolInvoke: IToolInvoke }
  | {
      type: SessionEventTypeEnum.TOOL_STATUS;
      toolInvokeId: string;
      status: string;
      toolName: string;
    }
  | { type: SessionEventTypeEnum.ERROR; message: string };

export interface IRoomEvent {
  id: string;
  createdAt: string;
  roomId: string;
  type: string;
  payload: Record<string, unknown>;
}
