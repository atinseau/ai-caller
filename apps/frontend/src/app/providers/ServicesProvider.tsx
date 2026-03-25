import { createContext, type ReactNode, useContext, useMemo } from "react";
import {
  type AudioCapturePort,
  AudioCaptureService,
} from "@/modules/audio/application/services/audio-capture.service";
import {
  type AudioPlaybackPort,
  AudioPlaybackService,
} from "@/modules/audio/application/services/audio-playback.service";
import {
  RealtimeWsRoomService,
  type WsRoomService,
} from "@/modules/audio/application/services/realtime-ws-room.service";

interface AppServices {
  audioCapture: AudioCapturePort;
  audioPlayback: AudioPlaybackPort;
  realtimeWsRoom: WsRoomService;
}

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const services = useMemo(
    () => ({
      audioCapture: new AudioCaptureService(),
      audioPlayback: new AudioPlaybackService(),
      realtimeWsRoom: new RealtimeWsRoomService(),
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
