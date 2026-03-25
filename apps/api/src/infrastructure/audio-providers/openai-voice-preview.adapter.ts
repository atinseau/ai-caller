import { injectable } from "inversify";
import type {
  PreviewResult,
  VoiceInfo,
  VoicePreviewPort,
} from "@/domain/ports/voice-preview.port.ts";
import { env } from "@/infrastructure/config/env.ts";

const OPENAI_VOICES: VoiceInfo[] = [
  { id: "alloy", label: "Alloy", tone: "Neutral, balanced" },
  { id: "ash", label: "Ash", tone: "Soft, clear" },
  { id: "ballad", label: "Ballad", tone: "Warm, expressive" },
  { id: "coral", label: "Coral", tone: "Bright, friendly" },
  { id: "echo", label: "Echo", tone: "Smooth, resonant" },
  { id: "marin", label: "Marin", tone: "Natural, conversational" },
  { id: "cedar", label: "Cedar", tone: "Confident, grounded" },
  { id: "sage", label: "Sage", tone: "Calm, measured" },
  { id: "shimmer", label: "Shimmer", tone: "Light, energetic" },
  { id: "verse", label: "Verse", tone: "Articulate, engaging" },
];

@injectable()
export class OpenAIVoicePreviewAdapter implements VoicePreviewPort {
  listVoices(): VoiceInfo[] {
    return OPENAI_VOICES;
  }

  async generatePreview(
    voice: string,
    _language: string,
    text: string,
    instructions: string,
  ): Promise<PreviewResult> {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input: text,
        voice,
        response_format: "mp3",
        speed: 1,
        instructions,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`OpenAI TTS failed: ${response.status}`);
    }

    return { stream: response.body, contentType: "audio/mpeg" };
  }
}
