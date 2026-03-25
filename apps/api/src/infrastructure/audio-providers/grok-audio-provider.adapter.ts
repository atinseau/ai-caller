import { inject, injectable } from "inversify";
import type {
  AudioProviderConfig,
  AudioProviderConnection,
  AudioProviderPort,
  NormalizedAudioEvent,
} from "@/domain/ports/audio-provider.port.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { env } from "@/infrastructure/config/env.ts";

const GROK_WS_URL = "wss://api.x.ai/v1/realtime";

type GrokServerEvent = {
  type: string;
  [key: string]: unknown;
};

@injectable()
export class GrokAudioProviderAdapter implements AudioProviderPort {
  constructor(@inject(LoggerPort) private readonly logger: LoggerPort) {}

  // biome-ignore lint/suspicious/useAwait: returns Promise via constructor, async needed for interface contract
  async connect(config: AudioProviderConfig): Promise<AudioProviderConnection> {
    const apiKey = env.get("XAI_API_KEY");
    if (!apiKey) {
      throw new Error("XAI_API_KEY is not configured");
    }

    const ws = new WebSocket(GROK_WS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
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
        this.logger.info("Grok Voice Agent WebSocket connected");

        // Send session configuration
        const sessionUpdate: Record<string, unknown> = {
          type: "session.update",
          session: {
            instructions: config.instructions,
            voice: config.voice,
            tools: config.tools,
            tool_choice: "auto",
            input_audio_transcription: {
              model: "whisper-large-v3",
              ...(config.language ? { language: config.language } : {}),
            },
            turn_detection: config.vadConfig
              ? {
                  type: config.vadConfig.type,
                  threshold: config.vadConfig.threshold ?? 0.85,
                  silence_duration_ms:
                    config.vadConfig.silenceDurationMs ?? 800,
                  prefix_padding_ms: config.vadConfig.prefixPaddingMs ?? 333,
                }
              : { type: "server_vad" },
            audio: {
              input: {
                format: {
                  type: config.inputAudioFormat?.type ?? "audio/pcm",
                  rate: config.inputAudioFormat?.rate ?? 24000,
                },
              },
              output: {
                format: {
                  type: config.outputAudioFormat?.type ?? "audio/pcm",
                  rate: config.outputAudioFormat?.rate ?? 24000,
                },
              },
            },
          },
        };

        this.logger.info(
          {
            toolCount: (sessionUpdate.session as { tools?: unknown[] }).tools
              ?.length,
            tools: (
              (sessionUpdate.session as { tools?: { name: string }[] }).tools ??
              []
            ).map((t) => t.name),
          },
          "Grok session.update sent",
        );
        ws.send(JSON.stringify(sessionUpdate));
        resolve(connection);
      };

      ws.onerror = (event) => {
        this.logger.error(event, "Grok Voice Agent WebSocket error");
        reject(new Error("Grok WebSocket connection failed"));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string) as GrokServerEvent;

        // Log errors from Grok that would otherwise be silently ignored
        if (
          msg.type === "error" ||
          msg.type === "session.update.error" ||
          (msg.type as string).endsWith(".error")
        ) {
          this.logger.error(
            msg as Record<string, unknown>,
            `Grok server error: ${msg.type}`,
          );
        }

        const normalized = GrokAudioProviderAdapter.normalizeEvent(msg);
        if (normalized) {
          for (const handler of handlers) {
            handler(normalized);
          }
        }
      };

      ws.onclose = () => {
        this.logger.info("Grok Voice Agent WebSocket closed");
      };
    });
  }

  static normalizeEvent(msg: GrokServerEvent): NormalizedAudioEvent | null {
    switch (msg.type) {
      case "response.output_audio_transcript.delta":
        return {
          type: "transcript.delta",
          text: (msg.delta as string) ?? "",
          role: "agent",
        };

      case "response.output_audio_transcript.done":
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

      case "response.output_audio.delta":
        return {
          type: "audio.delta",
          base64: (msg.delta as string) ?? "",
        };

      case "response.output_audio.done":
        return { type: "audio.done" };

      case "response.function_call_arguments.done": {
        return {
          type: "function_call",
          callId: (msg.call_id as string) ?? "",
          name: (msg.name as string) ?? "",
          arguments: (msg.arguments as string) ?? "{}",
        };
      }

      case "input_audio_buffer.speech_started":
        return { type: "speech_started" };

      case "input_audio_buffer.speech_stopped":
        return { type: "speech_stopped" };

      case "response.done":
        return { type: "response.done" };

      default:
        return null;
    }
  }
}
