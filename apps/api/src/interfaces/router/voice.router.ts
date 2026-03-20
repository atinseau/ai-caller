import { Hono } from "hono";
import { env } from "@/infrastructure/config/env.ts";

const PREVIEW_TEXTS: Record<string, string> = {
  fr: "Bonjour, ceci est un apercu de ma voix. Comment puis-je vous aider aujourd'hui ?",
  en: "Hello, this is a preview of my voice. How can I help you today?",
  es: "Hola, esta es una vista previa de mi voz. Como puedo ayudarle hoy?",
  de: "Hallo, dies ist eine Vorschau meiner Stimme. Wie kann ich Ihnen heute helfen?",
  it: "Ciao, questa e un'anteprima della mia voce. Come posso aiutarti oggi?",
  pt: "Ola, esta e uma previa da minha voz. Como posso ajuda-lo hoje?",
  nl: "Hallo, dit is een voorbeeld van mijn stem. Hoe kan ik u vandaag helpen?",
  pl: "Czesc, to podglad mojego glosu. Jak moge Ci dzis pomoc?",
  ru: "Zdravstvuyte, eto predvaritelnyy prosmotr moyego golosa. Chem ya mogu vam pomoch segodnya?",
  ja: "こんにちは、これは私の声のプレビューです。今日はどのようにお手伝いできますか？",
  zh: "你好，这是我的声音预览。今天我能帮您什么忙？",
  ko: "안녕하세요, 제 목소리 미리듣기입니다. 오늘 어떻게 도와드릴까요?",
  ar: "مرحبا، هذه معاينة لصوتي. كيف يمكنني مساعدتك اليوم؟",
  tr: "Merhaba, bu sesimin bir onizlemesidir. Bugun size nasil yardimci olabilirim?",
};

const DEFAULT_PREVIEW_TEXT = PREVIEW_TEXTS.en;

export const voiceRouter = new Hono();

// GET /api/v1/voice/preview?voice=marin&language=fr — returns audio preview of a voice
voiceRouter.get("/preview", async (ctx) => {
  const voice = ctx.req.query("voice") ?? "alloy";
  const language = ctx.req.query("language") ?? "en";
  const previewText = PREVIEW_TEXTS[language] ?? DEFAULT_PREVIEW_TEXT;

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.get("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      input: previewText,
      voice,
      response_format: "mp3",
      speed: 1,
      instructions:
        "Affect: friendly and warm. Speak naturally like a real person on a phone call — not like a robot reading text. Use a lively, conversational rhythm with slight variations in pace. Add subtle breath pauses between phrases. Sound genuinely engaged, as if you're happy to help someone.",
    }),
  });

  if (!response.ok || !response.body) {
    return ctx.json({ error: "Failed to generate voice preview" }, 500);
  }

  ctx.header("Content-Type", "audio/mpeg");
  ctx.header("Cache-Control", "public, max-age=86400");
  return ctx.body(response.body);
});
