import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { GenerationType } from "@/domain/enums/generation-type.enum.ts";
import { PromptSection } from "@/domain/enums/prompt-section.enum.ts";
import { TextGenerationPort } from "@/domain/ports/text-generation.port.ts";
import { UserRole } from "@/generated/prisma/client";
import { container } from "@/infrastructure/di/container.ts";

const SystemPromptSectionSchema = z.object({
  type: z
    .literal(GenerationType.SYSTEM_PROMPT_SECTION)
    .openapi({ description: "Generation type" }),
  companyId: z.string().openapi({ description: "Target company ID" }),
  section: z
    .enum(PromptSection)
    .openapi({ description: "The prompt section to generate" }),
  promptSections: z
    .object({
      [PromptSection.ROLE_OBJECTIVE]: z.string().optional(),
      [PromptSection.PERSONALITY_TONE]: z.string().optional(),
      [PromptSection.CONTEXT]: z.string().optional(),
      [PromptSection.REFERENCE_PRONUNCIATIONS]: z.string().optional(),
      [PromptSection.INSTRUCTIONS_RULES]: z.string().optional(),
      [PromptSection.CONVERSATION_FLOW]: z.string().optional(),
      [PromptSection.SAFETY_ESCALATION]: z.string().optional(),
    })
    .optional()
    .openapi({
      description:
        "Unsaved prompt sections from the editor (merged with saved company sections)",
    }),
  userMessage: z
    .string()
    .min(1)
    .openapi({ description: "The user's instruction for what to generate" }),
});

// Discriminated union — extend with new type schemas here
const GenerateRequestSchema = z.discriminatedUnion("type", [
  SystemPromptSectionSchema,
]);

export const generateRouter = new OpenAPIHono();

const generateRoute = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: GenerateRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Generated text content",
      content: {
        "application/json": {
          schema: z.object({ content: z.string() }),
        },
      },
    },
  },
});

generateRouter.openapi(generateRoute, async (ctx) => {
  const body = ctx.req.valid("json");

  // biome-ignore lint/suspicious/noExplicitAny: better-auth user injected by middleware
  const user = (ctx as any).get("user") as {
    companyId?: string | null;
    role: string;
  };

  // Access control: non-ROOT users can only generate for their own company
  if (user.role !== UserRole.ROOT && user.companyId !== body.companyId) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  const service = container.get(TextGenerationPort);
  const content = await service.generate({
    ...body,
    promptSections: body.promptSections ?? {},
  });
  return ctx.json({ content });
});
