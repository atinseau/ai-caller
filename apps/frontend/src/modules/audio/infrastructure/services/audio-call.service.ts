import { Api } from "@/infrastructure/http/api";
import { OpenAI } from "@ai-caller/shared"
import { injectable } from "inversify";
import type { AudioCallServicePort } from "../../domain/ports/audio-call-service.port";

@injectable()
export class AudioCallService implements AudioCallServicePort {
  private api: Api;

  constructor() {
    this.api = new Api()
  }

  async getToken(companyId: string) {
    const response = await this.api.get('/openai/token/' + companyId)
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch token')
    }
    return data.value
  }

  async startCall(pc: RTCPeerConnection, token: string) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const openai = new OpenAI({
      model: "gpt-realtime",
      apiKey: token,
    })

    const { answer, location } = await openai.realtime.calls(offer)
    await this.api.patch(`/openai/calls/${location?.split("/").pop()}`)
    await pc.setRemoteDescription(answer);
  }
}
