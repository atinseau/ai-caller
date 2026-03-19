import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/infrastructure/http/api";

interface UpdateCompanyDto {
  name?: string;
  mcpUrl?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  systemPrompt?: string | null;
  description?: string | null;
}

export function useUpdateCompany(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: UpdateCompanyDto) => {
      const res = await api.PATCH("/api/v1/company/{id}", {
        params: { path: { id: companyId } },
        body: dto,
      });
      if (!res.data) throw new Error("Failed to update company");
      return res.data.company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}
