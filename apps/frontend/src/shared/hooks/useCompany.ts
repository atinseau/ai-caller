import { useQuery } from "@tanstack/react-query";
import { api } from "@/infrastructure/http/api";

export function useCompany(id: string | null) {
  return useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const res = await api.GET("/api/v1/company/:id", {
        params: { path: { id: id! } },
      });
      if (!res.data) throw new Error("Company not found");
      return res.data.company;
    },
    enabled: !!id,
  });
}
