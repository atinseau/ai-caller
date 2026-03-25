import { useQuery } from "@tanstack/react-query";

type VoiceInfo = { id: string; label: string; tone: string };

export function useVoices() {
  return useQuery({
    queryKey: ["voices"],
    queryFn: async (): Promise<VoiceInfo[]> => {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/v1/voice/voices`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch voices");
      const data = (await res.json()) as { voices: VoiceInfo[] };
      return data.voices;
    },
    staleTime: 1000 * 60 * 60, // 1 hour — voices don't change at runtime
  });
}
