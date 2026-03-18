export enum SessionEventTypeEnum {
  TEXT_DELTA = "text_delta",
  TEXT_DONE = "text_done",
  USER_TRANSCRIPT = "user_transcript",
  AGENT_TRANSCRIPT_DELTA = "agent_transcript_delta",
  AGENT_TRANSCRIPT_DONE = "agent_transcript_done",
  TOOL_INVOKE_CREATED = "tool_invoke_created",
  TOOL_INVOKE_UPDATED = "tool_invoke_updated",
  TOOL_STATUS = "tool_status",
  ERROR = "error",
}
