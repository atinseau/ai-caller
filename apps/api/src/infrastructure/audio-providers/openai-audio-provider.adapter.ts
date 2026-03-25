import { inject, injectable } from "inversify";
import type {
  AudioProviderConfig,
  AudioProviderConnection,
  AudioProviderPort,
  NormalizedAudioEvent,
} from "@/domain/ports/audio-provider.port.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { env } from "@/infrastructure/config/env.ts";

const OPENAI_WS_URL = "wss://api.openai.com/v1/realtime";

type OpenAIServerEvent = {
  type: string;
  [key: string]: unknown;
};

@injectable()
export class OpenAIAudioProviderAdapter implements AudioProviderPort {
  constructor(@inject(LoggerPort) private readonly logger: LoggerPort) {}

  // biome-ignore lint/suspicious/useAwait: returns Promise via constructor, async needed for interface contract
  async connect(config: AudioProviderConfig): Promise<AudioProviderConnection> {
    const apiKey = env.get("OPENAI_API_KEY");
    const wsUrl = `${OPENAI_WS_URL}?model=gpt-realtime-1.5`;

    const ws = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
      // biome-ignore lint/suspicious/noExplicitAny: WebSocket options typing
    } as any);

    const handlers: ((event: NormalizedAudioEvent) => void)[] = [];

    const connection: AudioProviderConnection = {
      sendAudio(base64Audio: string) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "input_audio_buffer.append",
              audio: base64Audio,
            }),
          );
        }
      },

      sendText(text: string) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: "user",
                content: [{ type: "input_text", text }],
              },
            }),
          );
          ws.send(JSON.stringify({ type: "response.create" }));
        }
      },

      sendFunctionResult(callId: string, output: string) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: callId,
                output,
              },
            }),
          );
          ws.send(JSON.stringify({ type: "response.create" }));
        }
      },

      onEvent(handler: (event: NormalizedAudioEvent) => void) {
        handlers.push(handler);
      },

      close() {
        ws.close();
      },
    };

    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        this.logger.info("OpenAI Realtime WebSocket connected");

        // Send session configuration
        const audioFormat =
          config.inputAudioFormat?.type === "audio/pcmu"
            ? "g711_ulaw"
            : "pcm16";

        const sessionUpdate = {
          type: "session.update",
          session: {
            instructions: config.instructions,
            output_modalities: ["audio"],
            tools: config.tools,
            tool_choice: "auto",
            input_audio_format: audioFormat,
            output_audio_format: audioFormat,
            input_audio_transcription: {
              model: "gpt-4o-mini-transcribe",
              ...(config.language ? { language: config.language } : {}),
            },
            turn_detection: {
              type: "semantic_vad",
              eagerness:
                config.vadConfig?.type === "server_vad" ? "medium" : "medium",
              interrupt_response: true,
            },
            audio: {
              output: {
                voice: config.voice,
                speed: 1,
              },
            },
          },
        };

        ws.send(JSON.stringify(sessionUpdate));
        resolve(connection);
      };

      ws.onerror = (event) => {
        this.logger.error(event, "OpenAI Realtime WebSocket error");
        reject(new Error("OpenAI WebSocket connection failed"));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string) as OpenAIServerEvent;
        const normalized = OpenAIAudioProviderAdapter.normalizeEvent(msg);
        if (normalized) {
          for (const handler of handlers) {
            handler(normalized);
          }
        }
      };

      ws.onclose = () => {
        this.logger.info("OpenAI Realtime WebSocket closed");
      };
    });
  }

  static normalizeEvent(msg: OpenAIServerEvent): NormalizedAudioEvent | null {
    switch (msg.type) {
      case "response.audio_transcript.delta":
        return {
          type: "transcript.delta",
          text: (msg.delta as string) ?? "",
          role: "agent",
        };

      case "response.audio_transcript.done":
        return {
          type: "transcript.done",
          text: (msg.transcript as string) ?? "",
          role: "agent",
        };

      case "conversation.item.input_audio_transcription.completed":
        return {
          type: "transcript.done",
          text: (msg.transcript as string) ?? "",
          role: "user",
        };

      case "response.audio.delta":
        return {
          type: "audio.delta",
          base64: (msg.delta as string) ?? "",
        };

      case "response.audio.done":
        return { type: "audio.done" };

      case "response.output_item.done": {
        // biome-ignore lint/suspicious/noExplicitAny: OpenAI event item typing varies
        const item = msg.item as any;
        if (item?.type === "function_call" && item.status === "completed") {
          return {
            type: "function_call",
            callId: item.id ?? "",
            name: item.name ?? "",
            arguments: item.arguments ?? "{}",
          };
        }
        return null;
      }

      case "input_audio_buffer.speech_started":
        return { type: "speech_started" };

      case "input_audio_buffer.speech_stopped":
        return { type: "speech_stopped" };

      case "output_audio_buffer.stopped":
        return { type: "response.done" };

      default:
        return null;
    }
  }
}
