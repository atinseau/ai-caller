import type { CompanyModel } from "@ai-caller/api/types";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Api } from "@/infrastructure/http/api";

export function useCompanies() {
  const { data, isLoading } = useSuspenseQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const api = new Api();
      const response = await api.get("/company/all");
      const data = (await response.json()) as {
        companies: CompanyModel[];
        message: string;
      };
      return data.companies;
    },
  });

  return {
    companies: data,
    isLoading,
  };
}
