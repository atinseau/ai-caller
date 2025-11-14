import { Api } from "@/adapters/api";
import { OpenAI } from "@ai-caller/shared";

export function handleAudioWebRtcUseCase(
  companyId: string,
  audioStream: MediaStream,
  audioRef: React.RefObject<HTMLAudioElement>,
  onError: (data: any) => void
) {
  const pc = new RTCPeerConnection();
  const dc = pc.createDataChannel("oai-events");

  const api = new Api()

  api.get('/openai/token/' + companyId)
    .then(async (response) => {
      const data = await response.json()

      if (!response.ok) {
        onError(data)
        return
      }

      pc.addTrack(audioStream.getTracks()[0]);
      pc.ontrack = (e) => (audioRef.current.srcObject = e.streams[0]);

      // Start the session using the Session Description Protocol (SDP)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const openai = new OpenAI({
        model: "gpt-realtime",
        apiKey: data.value,
      })

      const { answer, location } = await openai.realtime.calls(offer)

      await api.patch(`/openai/calls/${location?.split("/").pop()}`)
      await pc.setRemoteDescription(answer);
    })
    .catch((error) => {
      console.error("Error setting up WebRTC connection:", error);
    });

  return {
    pc,
    dc
  }
}
