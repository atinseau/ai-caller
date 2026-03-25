import { api } from "@/infrastructure/http/api";

export interface WsRoomService {
  createRoom(companyId: string, isTest?: boolean): Promise<{ roomId: string }>;
  connectAudioWs(
    roomId: string,
    onAudioChunk: (base64: string) => void,
    onInterrupt: () => void,
    onClose: () => void,
  ): WebSocket;
}

function buildWsUrl(path: string): string {
  const httpUrl = import.meta.env.VITE_API_URL as string;
  return httpUrl.replace(/^http/, "ws") + path;
}

export class RealtimeWsRoomService implements WsRoomService {
  async createRoom(
    companyId: string,
    isTest?: boolean,
  ): Promise<{ roomId: string }> {
    const { response, data } = await api.POST("/api/v1/room/create", {
      body: {
        companyId,
        modality: "AUDIO",
        isTest: isTest ?? false,
      },
    });
    if (!response.ok || !data) {
      throw new Error("Failed to create room");
    }
    return { roomId: data.data.id };
  }

  connectAudioWs(
    roomId: string,
    onAudioChunk: (base64: string) => void,
    onInterrupt: () => void,
    onClose: () => void,
  ): WebSocket {
    const url = buildWsUrl(`/api/v1/room/${roomId}/audio`);
    const ws = new WebSocket(url);

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type?: string;
          audio?: string;
        };
        if (msg.type === "audio" && msg.audio) {
          onAudioChunk(msg.audio);
        } else if (msg.type === "interrupt") {
          onInterrupt();
        } else if (msg.type === "close") {
          // Server signaled session end — close the WebSocket
          ws.close();
        }
      } catch {
        /* Ignore malformed messages */
      }
    };

    ws.onclose = () => {
      onClose();
    };

    return ws;
  }
}
