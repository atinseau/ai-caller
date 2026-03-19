import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/infrastructure/http/api";

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: { name: string; description?: string }) => {
      const res = await api.POST("/api/v1/company", {
        body: dto,
      });
      if (!res.data) throw new Error("Failed to create company");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}
