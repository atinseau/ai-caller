import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { PromptPort } from "@/domain/ports/prompt.port.ts";
import { VoicePreviewPort } from "@/domain/ports/voice-preview.port.ts";
import { CompanyRepositoryPort } from "@/domain/repositories/company-repository.port.ts";
import { container } from "@/infrastructure/di/container.ts";

const LANGUAGE_LABELS: Record<string, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  ru: "Russian",
  ja: "Japanese",
  zh: "Chinese",
  ko: "Korean",
  ar: "Arabic",
  tr: "Turkish",
};

const PREVIEW_TEMPLATES: Record<string, string> = {
  fr: "Bonjour, je suis {{voiceName}} et je travaille pour {{companyName}}. Je suis là pour répondre à vos appels, vous orienter vers le bon service et répondre à toutes vos questions. N'hésitez pas, comment puis-je vous aider ?",
  en: "Hello, my name is {{voiceName}} and I work for {{companyName}}. I'm here to answer your calls, direct you to the right department and answer all your questions. How can I help you today?",
  es: "Hola, me llamo {{voiceName}} y trabajo para {{companyName}}. Estoy aquí para atender sus llamadas, dirigirle al departamento adecuado y responder a todas sus preguntas. ¿En qué puedo ayudarle?",
  de: "Guten Tag, mein Name ist {{voiceName}} und ich arbeite für {{companyName}}. Ich bin hier, um Ihre Anrufe entgegenzunehmen, Sie an die richtige Abteilung weiterzuleiten und alle Ihre Fragen zu beantworten. Wie kann ich Ihnen helfen?",
  it: "Buongiorno, mi chiamo {{voiceName}} e lavoro per {{companyName}}. Sono qui per rispondere alle vostre chiamate, indirizzarvi al servizio giusto e rispondere a tutte le vostre domande. Come posso aiutarla?",
  pt: "Olá, o meu nome é {{voiceName}} e trabalho para {{companyName}}. Estou aqui para atender as suas chamadas, encaminhá-lo para o departamento certo e responder a todas as suas perguntas. Como posso ajudá-lo?",
  nl: "Hallo, mijn naam is {{voiceName}} en ik werk voor {{companyName}}. Ik ben er om uw telefoontjes te beantwoorden, u door te verbinden met de juiste afdeling en al uw vragen te beantwoorden. Hoe kan ik u helpen?",
  pl: "Dzień dobry, mam na imię {{voiceName}} i pracuję dla {{companyName}}. Jestem tu, aby odbierać Państwa telefony, kierować do odpowiedniego działu i odpowiadać na wszystkie pytania. W czym mogę pomóc?",
  ru: "Здравствуйте, меня зовут {{voiceName}} и я работаю в {{companyName}}. Я здесь, чтобы отвечать на ваши звонки, направлять вас в нужный отдел и отвечать на все ваши вопросы. Чем могу помочь?",
  ja: "お電話ありがとうございます。{{companyName}}の{{voiceName}}です。お電話の対応、担当部署へのお取り次ぎ、ご質問への回答をさせていただきます。どのようなご用件でしょうか？",
  zh: "您好，我是{{voiceName}}，在{{companyName}}工作。我在这里为您接听电话、为您转接合适的部门并回答您的所有问题。请问有什么可以帮您的？",
  ko: "안녕하세요, 저는 {{voiceName}}이고 {{companyName}}에서 근무하고 있습니다. 전화 응대, 적합한 부서 연결, 모든 질문에 대한 답변을 도와드리겠습니다. 어떻게 도와드릴까요?",
  ar: "مرحباً، اسمي {{voiceName}} وأعمل في {{companyName}}. أنا هنا للرد على مكالماتكم وتوجيهكم إلى القسم المناسب والإجابة على جميع أسئلتكم. كيف يمكنني مساعدتك؟",
  tr: "Merhaba, ben {{voiceName}}, {{companyName}} için çalışıyorum. Aramalarınızı yanıtlamak, sizi doğru birime yönlendirmek ve tüm sorularınızı cevaplamak için buradayım. Size nasıl yardımcı olabilirim?",
};

const DEFAULT_TEMPLATE =
  "Hello, my name is {{voiceName}} and I work for {{companyName}}. I'm here to answer your calls and help you with anything you need. How can I help you today?";

export const voiceRouter = new OpenAPIHono();

// ─── GET /voices ────────────────────────────────────────────────────────────

const listVoicesRoute = createRoute({
  method: "get",
  path: "/voices",
  responses: {
    200: {
      description: "Available voices for the active audio provider",
      content: {
        "application/json": {
          schema: z.object({
            voices: z.array(
              z.object({
                id: z.string(),
                label: z.string(),
                tone: z.string(),
              }),
            ),
          }),
        },
      },
    },
  },
});

voiceRouter.openapi(listVoicesRoute, (ctx) => {
  const voicePreview = container.get(VoicePreviewPort);
  return ctx.json({ voices: voicePreview.listVoices() });
});

// ─── GET /preview ───────────────────────────────────────────────────────────

const previewRoute = createRoute({
  method: "get",
  path: "/preview",
  request: {
    query: z.object({
      voice: z.string().optional().openapi({ description: "Voice ID" }),
      language: z.string().optional().openapi({ description: "Language code" }),
      companyId: z.string().optional().openapi({
        description: "Company ID (for ROOT users managing multiple companies)",
      }),
    }),
  },
  responses: {
    200: {
      description: "Audio preview of the voice",
    },
  },
});

voiceRouter.openapi(previewRoute, async (ctx) => {
  const query = ctx.req.valid("query");
  const voicePreview = container.get(VoicePreviewPort);
  const promptService = container.get(PromptPort);
  const companyRepo = container.get(CompanyRepositoryPort);

  const voices = voicePreview.listVoices();
  const selectedVoice = String(query.voice ?? voices[0]?.id ?? "alloy");
  const selectedLanguage = String(query.language ?? "en");
  const languageLabel = LANGUAGE_LABELS[selectedLanguage] ?? selectedLanguage;

  // Get voice label from provider
  const voiceInfo = voices.find((v) => v.id === selectedVoice);
  const voiceName = voiceInfo?.label ?? selectedVoice;

  // Get company name: prefer query param (ROOT managing companies), fallback to user's company
  // biome-ignore lint/suspicious/noExplicitAny: better-auth user injected by middleware
  const user = (ctx as any).get("user") as {
    companyId?: string | null;
  } | null;
  const targetCompanyId = query.companyId ?? user?.companyId;

  const company = targetCompanyId
    ? await companyRepo.findById(targetCompanyId)
    : null;
  const companyName = company?.name ?? "";

  // Build preview text from template
  const template = PREVIEW_TEMPLATES[selectedLanguage] ?? DEFAULT_TEMPLATE;
  const previewText = template
    .replace(/\{\{voiceName\}\}/g, voiceName)
    .replace(/\{\{companyName\}\}/g, companyName);

  const instructions = await promptService.render("voice-preview-prompt", {
    language: languageLabel,
    text: previewText,
  });

  try {
    const result = await voicePreview.generatePreview(
      selectedVoice,
      selectedLanguage,
      previewText,
      instructions,
    );

    ctx.header("Content-Type", result.contentType);
    ctx.header("Cache-Control", "no-store");
    return ctx.body(result.stream);
  } catch {
    return ctx.json({ error: "Failed to generate voice preview" }, 500);
  }
});
