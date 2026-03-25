export type NormalizedAudioEvent =
  | { type: "transcript.delta"; text: string; role: "user" | "agent" }
  | { type: "transcript.done"; text: string; role: "user" | "agent" }
  | { type: "audio.delta"; base64: string }
  | { type: "audio.done" }
  | {
      type: "function_call";
      callId: string;
      name: string;
      arguments: string;
    }
  | { type: "speech_started" }
  | { type: "speech_stopped" }
  | { type: "response.done" }
  | { type: "error"; message: string };

export type ProviderTool = {
  type: "function";
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
};

export type VadConfig = {
  type: "server_vad" | null;
  threshold?: number;
  silenceDurationMs?: number;
  prefixPaddingMs?: number;
};

export type AudioFormat = {
  type: "audio/pcm" | "audio/pcmu" | "audio/pcma";
  rate: number;
};

export type AudioProviderConfig = {
  instructions: string;
  tools: ProviderTool[];
  voice: string;
  language?: string;
  vadConfig?: VadConfig;
  inputAudioFormat?: AudioFormat;
  outputAudioFormat?: AudioFormat;
  /** MCP server URL for tool execution (passed to session, not to provider) */
  mcpUrl?: string;
  /** Whether this is a test session (passed to session, not to provider) */
  isTest?: boolean;
};

export interface AudioProviderConnection {
  /** Send audio chunk (base64) to provider */
  sendAudio(base64Audio: string): void;
  /** Send text input to provider */
  sendText(text: string): void;
  /** Send function call output back to provider */
  sendFunctionResult(callId: string, output: string): void;
  /** Subscribe to normalized events */
  onEvent(handler: (event: NormalizedAudioEvent) => void): void;
  /** Close the connection */
  close(): void;
}

/**
 * Abstract port for audio AI providers (Grok, OpenAI, Gemini, etc.)
 * Each provider implements this port to normalize their WebSocket protocol
 * into a unified event stream.
 */
export abstract class AudioProviderPort {
  abstract connect(
    config: AudioProviderConfig,
  ): Promise<AudioProviderConnection>;
}
