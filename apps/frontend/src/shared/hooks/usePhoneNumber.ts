import { useMutation, useQueryClient } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL;

export function useProvisionPhoneNumber(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { country: string; areaCode?: string }) => {
      const res = await fetch(
        `${API_URL}/api/v1/company/${companyId}/phone-number`,
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
            "Failed to provision phone number",
        );
      }
      const data = await res.json();
      return data.phoneNumber as {
        id: string;
        phoneNumber: string;
        companyId: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    },
  });
}

export function useReleasePhoneNumber(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${API_URL}/api/v1/company/${companyId}/phone-number`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) {
        throw new Error("Failed to release phone number");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    },
  });
}
