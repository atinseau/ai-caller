import { inject, injectable } from "inversify";
import { AudioCallServicePort } from "../../domain/ports/audio-call-service.port";

type AudioWebRtcUseCaseParams = {
  audioStream: MediaStream,
  audioRef: React.RefObject<HTMLAudioElement>,
  companyId: string,
  onConnected: (pc: RTCPeerConnection, dc: RTCDataChannel) => void,
  onError: (error: Error) => void,
  onClosed: () => void,
  onMessage: (data: any) => void,
}

@injectable()
export class AudioWebRtcUseCase {
  constructor(
    @inject(AudioCallServicePort) private readonly audioCallService: AudioCallServicePort
  ) { }

  async execute(params: AudioWebRtcUseCaseParams) {
    try {
      const token = await this.audioCallService.getToken(params.companyId)
      const pc = new RTCPeerConnection();
      const dc = pc.createDataChannel("oai-events");

      pc.addTrack(params.audioStream.getTracks()[0]);
      pc.ontrack = (e) => (params.audioRef.current.srcObject = e.streams[0]);

      await this.audioCallService.startCall(pc, token)
      params.onConnected(pc, dc)
    } catch (error) {
      params.onError(error as Error)
    }
  }

}

// 019a8237-d30c-7000-a211-c01a756390e0

// export function handleAudioWebRtcUseCase(
//   companyId: string,
//   audioStream: MediaStream,
//   audioRef: React.RefObject<HTMLAudioElement>,
//   onError: (data: any) => void
// ) {
//   const pc = new RTCPeerConnection();
//   const dc = pc.createDataChannel("oai-events");

//   const api = new Api()

//   api.get('/openai/token/' + companyId)
//     .then(async (response) => {
//       const data = await response.json()

//       if (!response.ok) {
//         onError(data)
//         return
//       }

//       pc.addTrack(audioStream.getTracks()[0]);
//       pc.ontrack = (e) => (audioRef.current.srcObject = e.streams[0]);

//       // Start the session using the Session Description Protocol (SDP)
//       const offer = await pc.createOffer();
//       await pc.setLocalDescription(offer);

//       const openai = new OpenAI({
//         model: "gpt-realtime",
//         apiKey: data.value,
//       })

//       const { answer, location } = await openai.realtime.calls(offer)

//       await api.patch(`/openai/calls/${location?.split("/").pop()}`)
//       await pc.setRemoteDescription(answer);
//     })
//     .catch((error) => {
//       console.error("Error setting up WebRTC connection:", error);
//     });

//   return {
//     pc,
//     dc
//   }
// }
