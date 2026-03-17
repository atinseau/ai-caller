import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { AudioStreamService } from "@/infrastructure/browser/audio-stream";
import { AudioStream } from "@/infrastructure/browser/audio-stream";
import type { RealtimeRoomService } from "@/modules/audio/application/services/realtime-openai-room.service";
import { RealtimeOpenAiRoomService } from "@/modules/audio/application/services/realtime-openai-room.service";

interface AppServices {
  audioStream: AudioStreamService;
  realtimeRoom: RealtimeRoomService;
}

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const services = useMemo(
    () => ({
      audioStream: new AudioStream(),
      realtimeRoom: new RealtimeOpenAiRoomService(),
    }),
    [],
  );

  return <ServicesContext value={services}>{children}</ServicesContext>;
}

export function useServices(): AppServices {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error("useServices must be used within ServicesProvider");
  return ctx;
}
