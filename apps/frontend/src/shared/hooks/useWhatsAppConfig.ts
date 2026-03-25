import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL;

export interface WhatsAppConfig {
  id: string;
  phoneNumberId: string;
  active: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export function useWhatsAppConfig(companyId: string | null) {
  return useQuery({
    queryKey: ["whatsapp-config", companyId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/v1/company/${companyId}/whatsapp`,
        { credentials: "include" },
      );
      if (!res.ok) {
        throw new Error("Failed to fetch WhatsApp config");
      }
      const data = await res.json();
      return data.config as WhatsAppConfig | null;
    },
    enabled: !!companyId,
  });
}

export function useCreateWhatsAppConfig(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { phoneNumberId: string }) => {
      const res = await fetch(
        `${API_URL}/api/v1/company/${companyId}/whatsapp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          (data as { message?: string })?.message ??
            "Failed to create WhatsApp config",
        );
      }
      const data = await res.json();
      return data.config as WhatsAppConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      queryClient.invalidateQueries({
        queryKey: ["whatsapp-config", companyId],
      });
    },
  });
}

export function useUpdateWhatsAppConfig(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { phoneNumberId?: string; active?: boolean }) => {
      const res = await fetch(
        `${API_URL}/api/v1/company/${companyId}/whatsapp`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          (data as { message?: string })?.message ??
            "Failed to update WhatsApp config",
        );
      }
      const data = await res.json();
      return data.config as WhatsAppConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      queryClient.invalidateQueries({
        queryKey: ["whatsapp-config", companyId],
      });
    },
  });
}

export function useDeleteWhatsAppConfig(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${API_URL}/api/v1/company/${companyId}/whatsapp`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) {
        throw new Error("Failed to delete WhatsApp config");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      queryClient.invalidateQueries({
        queryKey: ["whatsapp-config", companyId],
      });
    },
  });
}
