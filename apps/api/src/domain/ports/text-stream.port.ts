import type { IToolInvokeModel } from "../models/tool.model";

export type TextStreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "text_done"; text: string }
  | { type: "user_transcript"; text: string }
  | { type: "agent_transcript_delta"; text: string }
  | { type: "agent_transcript_done"; text: string }
  | {
      type: "tool_invoke_created";
      toolInvoke: IToolInvokeModel;
    }
  | {
      type: "tool_invoke_updated";
      toolInvoke: IToolInvokeModel;
    }
  | {
      type: "tool_status";
      toolInvokeId: string;
      status: string;
      toolName: string;
    }
  | { type: "error"; message: string };

export abstract class TextStreamPort {
  abstract subscribe(roomId: string): AsyncIterable<TextStreamEvent>;
  abstract publish(roomId: string, event: TextStreamEvent): void;
  abstract close(roomId: string): void;
}
