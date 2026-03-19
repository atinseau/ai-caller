import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/infrastructure/http/api";

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.DELETE("/api/v1/company/:id", {
        params: { path: { id } },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}
