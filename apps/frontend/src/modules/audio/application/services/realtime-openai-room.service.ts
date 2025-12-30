import { injectable } from "inversify";
import { Api } from "@/infrastructure/http/api";
import { OpenAI } from "@ai-caller/shared"
import type { RealtimeRoomServicePort } from "../../domain/ports/realtime-room-service.port";
import type { RoomModel } from "@ai-caller/api/types"

@injectable()
export class RealtimeOpenAiRoomService implements RealtimeRoomServicePort {

  constructor(
    private readonly api = new Api()
  ) { }

  async createRoom(companyId: string) {
    const roomData = await this.getRoomData(companyId)
    const pc = new RTCPeerConnection();
    const dc = pc.createDataChannel("oai-events");

    return {
      roomToken: roomData.token,
      roomId: roomData.id,
      pc,
      dc
    }
  }

  async attachCallToRoom(pc: RTCPeerConnection, roomId: string, roomToken: string): Promise<void> {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const openai = new OpenAI({
      model: "gpt-realtime",
      apiKey: roomToken,
    })

    const { answer, location } = await openai.realtime.calls(offer)
    const callId = location?.split("/").pop()
    if (!callId?.length) {
      throw new Error('Failed to retrieve call ID from OpenAI response')
    }

    const response = await this.api.patch(`/room/${roomId}/attach/${callId}`)
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Failed to attach call to room')
    }

    await pc.setRemoteDescription(answer);
  }

  private async getRoomData(companyId: string): Promise<RoomModel> {
    const response = await this.api.post('/room/create', {
      companyId
    })
    const body = await response.json()
    if (!response.ok || !body?.data) {
      throw new Error(body.message || 'Failed to create room')
    }
    return body.data
  }
}
