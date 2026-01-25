import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/infrastructure/http/api";

export function useCompanies() {
  const { data, isLoading } = useSuspenseQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const response = await api.GET("/api/v1/company/me");
      return response.data?.companies || [];
    },
  });

  return {
    companies: data,
    isLoading,
  };
}
