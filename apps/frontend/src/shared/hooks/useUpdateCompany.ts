import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/infrastructure/http/api";
import type { LanguageEnum } from "@/shared/enums/language.enum";
import type { VadEagernessEnum } from "@/shared/enums/vad-eagerness.enum";

interface SystemPromptSections {
  roleObjective?: string;
  personalityTone?: string;
  context?: string;
  referencePronunciations?: string;
  instructionsRules?: string;
  conversationFlow?: string;
  safetyEscalation?: string;
}

interface UpdateCompanyDto {
  name?: string;
  mcpUrl?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  systemPromptSections?: SystemPromptSections | null;
  description?: string | null;
  toolConfigs?: Record<
    string,
    {
      displayName?: string;
      description?: string;
      parameters?: Record<string, { description?: string }>;
    }
  > | null;
  systemToolPrompts?: Record<string, string> | null;
  voice?: string | null;
  language?: LanguageEnum | null;
  vadEagerness?: VadEagernessEnum | null;
}

export function useUpdateCompany(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: UpdateCompanyDto) => {
      // Cast body to allow dynamic voice IDs — voices are fetched from the backend
      // and may not match the statically generated OpenAPI voice union
      const res = await api.PATCH("/api/v1/company/{id}", {
        params: { path: { id: companyId } },
        body: dto as Record<string, unknown>,
      });
      if (res.error) {
        const message =
          (res.error as { message?: string }).message ??
          "Failed to update company";
        throw new Error(message);
      }
      if (!res.data) throw new Error("Failed to update company");
      return res.data.company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}
