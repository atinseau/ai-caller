import { injectable } from "inversify";
import type {
  PreviewResult,
  VoiceInfo,
  VoicePreviewPort,
} from "@/domain/ports/voice-preview.port.ts";
import { env } from "@/infrastructure/config/env.ts";

const GROK_VOICES: VoiceInfo[] = [
  { id: "eve", label: "Eve", tone: "Energetic, upbeat" },
  { id: "ara", label: "Ara", tone: "Warm, friendly" },
  { id: "rex", label: "Rex", tone: "Confident, professional" },
  { id: "sal", label: "Sal", tone: "Smooth, balanced" },
  { id: "leo", label: "Leo", tone: "Authoritative, commanding" },
];

const SAMPLE_RATE = 24000;
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;

/**
 * Builds a WAV header for PCM16 mono audio.
 */
function buildWavHeader(pcmDataLength: number): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);

  // "RIFF" chunk
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + pcmDataLength, true); // file size - 8
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, NUM_CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);

  // "data" sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, pcmDataLength, true);

  return new Uint8Array(header);
}

type GrokWsEvent = {
  type: string;
  delta?: string;
  [key: string]: unknown;
};

@injectable()
export class GrokVoicePreviewAdapter implements VoicePreviewPort {
  listVoices(): VoiceInfo[] {
    return GROK_VOICES;
  }

  async generatePreview(
    voice: string,
    _language: string,
    text: string,
    instructions: string,
  ): Promise<PreviewResult> {
    const apiKey = env.get("XAI_API_KEY");
    if (!apiKey) {
      throw new Error("XAI_API_KEY is not configured");
    }

    // Collect all audio via Voice Agent WebSocket
    const pcmChunks = await this.generateViaVoiceAgent(
      apiKey,
      voice,
      text,
      instructions,
    );

    // Build WAV from PCM chunks
    const totalPcmLength = pcmChunks.reduce((acc, c) => acc + c.length, 0);
    const wavHeader = buildWavHeader(totalPcmLength);
    const wavBuffer = new Uint8Array(44 + totalPcmLength);
    wavBuffer.set(wavHeader, 0);

    let offset = 44;
    for (const chunk of pcmChunks) {
      wavBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    return {
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(wavBuffer);
          controller.close();
        },
      }),
      contentType: "audio/wav",
    };
  }

  private generateViaVoiceAgent(
    apiKey: string,
    voice: string,
    _text: string,
    instructions: string,
  ): Promise<Uint8Array[]> {
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Voice Agent preview timed out"));
      }, 15_000);

      const ws = new WebSocket("wss://api.x.ai/v1/realtime", {
        headers: { Authorization: `Bearer ${apiKey}` },
        // biome-ignore lint/suspicious/noExplicitAny: WebSocket options typing
      } as any);

      ws.onopen = () => {
        // Configure session with instructions and voice
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              instructions,
              voice: voice.charAt(0).toUpperCase() + voice.slice(1),
              turn_detection: { type: null },
              audio: {
                output: {
                  format: { type: "audio/pcm", rate: SAMPLE_RATE },
                },
              },
            },
          }),
        );
      };

      let sessionReady = false;

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string) as GrokWsEvent;

        if (msg.type === "session.updated" && !sessionReady) {
          sessionReady = true;
          // Trigger the agent to speak — text is already in instructions
          ws.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: "user",
                content: [{ type: "input_text", text: "Go." }],
              },
            }),
          );
          ws.send(JSON.stringify({ type: "response.create" }));
        }

        if (msg.type === "response.output_audio.delta" && msg.delta) {
          const binary = atob(msg.delta);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          chunks.push(bytes);
        }

        if (msg.type === "response.done") {
          clearTimeout(timeout);
          ws.close();
          resolve(chunks);
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Voice Agent WebSocket error"));
      };

      ws.onclose = () => {
        clearTimeout(timeout);
        if (chunks.length > 0) {
          resolve(chunks);
        }
      };
    });
  }
}
