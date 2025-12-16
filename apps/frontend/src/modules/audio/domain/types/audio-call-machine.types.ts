import { AudioCallMachineEvent } from "../enums/audio-call-machine-event.enum"

export type AudioCallMachineContext = {
  companyId?: string
  audioStream?: MediaStream,
  peerConnection?: RTCPeerConnection,
  dataChannel?: RTCDataChannel,
  audioRef?: React.RefObject<HTMLAudioElement>,
}


export type AudioCallMachineEvents =
  | { type: typeof AudioCallMachineEvent.ERROR, error?: Error }
  | { type: typeof AudioCallMachineEvent.START, companyId: string, audioRef: React.RefObject<HTMLAudioElement> }
  | { type: typeof AudioCallMachineEvent.CONNECTED, pc: RTCPeerConnection, dc: RTCDataChannel }
  | { type: typeof AudioCallMachineEvent.STOP }
// | { type: "STOP_CALL" }
// | { type: "RTC_OPEN", pc: RTCPeerConnection, dc: RTCDataChannel }
// | { type: "RTC_ERROR" }
// | { type: "RTC_CLOSE" }
// | { type: "MESSAGE", message: string }
// | { type: "SET_DATA_CHANNEL", dataChannel: RTCDataChannel }
