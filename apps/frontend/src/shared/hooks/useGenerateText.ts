import { useMutation } from "@tanstack/react-query";
import type { PromptSection } from "@/shared/enums/prompt-section.enum";

type GeneratePromptSectionRequest = {
  type: "SYSTEM_PROMPT_SECTION";
  companyId: string;
  section: PromptSection;
  promptSections: Partial<Record<PromptSection, string>>;
  userMessage: string;
};

// Discriminated union — extend with new types here
type GenerateTextRequest = GeneratePromptSectionRequest;

type GenerateTextResponse = {
  content: string;
};

export function useGenerateText() {
  const apiUrl = import.meta.env.VITE_API_URL;

  return useMutation({
    mutationFn: async (request: GenerateTextRequest): Promise<string> => {
      const res = await fetch(`${apiUrl}/api/v1/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: "Generation failed" }));
        throw new Error(
          (error as { message?: string }).message ?? "Generation failed",
        );
      }

      const data = (await res.json()) as GenerateTextResponse;
      return data.content;
    },
  });
}
