import { OpenAI } from "@ai-caller/shared";
import { injectable } from "inversify";
import { api } from "@/infrastructure/http/api";
import type { RealtimeRoomServicePort } from "../../domain/ports/realtime-room-service.port";

@injectable()
export class RealtimeOpenAiRoomService implements RealtimeRoomServicePort {
  async createRoom(companyId: string) {
    const roomData = await this.getRoomData(companyId);
    const pc = new RTCPeerConnection();
    const dc = pc.createDataChannel("oai-events");

    return {
      roomToken: roomData.token,
      roomId: roomData.id,
      pc,
      dc,
    };
  }

  async attachCallToRoom(
    pc: RTCPeerConnection,
    roomId: string,
    roomToken: string,
  ): Promise<void> {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const openai = new OpenAI({
      model: "gpt-realtime",
      apiKey: roomToken,
    });

    const { answer, location } = await openai.realtime.calls(offer);
    const callId = location?.split("/").pop();
    if (!callId?.length) {
      throw new Error("Failed to retrieve call ID from OpenAI response");
    }

    const { response } = await api.PATCH("/api/v1/room/{roomId}/attach/{id}", {
      params: {
        path: {
          roomId,
          id: callId,
        },
      },
    });
    if (!response.ok) {
      throw new Error("Failed to attach call to room");
    }

    await pc.setRemoteDescription(answer);
  }

  private async getRoomData(companyId: string) {
    const { response, data } = await api.POST("/api/v1/room/create", {
      body: {
        companyId,
      },
    });
    if (!response.ok || !data) {
      throw new Error("Failed to create room");
    }
    return data.data;
  }
}
