export type TextStreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "text_done"; text: string }
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
