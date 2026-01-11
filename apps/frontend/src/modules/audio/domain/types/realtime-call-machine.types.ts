import type { RealtimeCallMachineEvent } from "../enums/realtime-call-machine-event.enum";

export type RealtimeCallMachineContext = {
  companyId?: string;
  audioStream?: MediaStream;
  peerConnection?: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  audioRef?: React.RefObject<HTMLAudioElement>;
  muted: boolean;
};

export type RealtimeCallMachineEvents =
  | { type: typeof RealtimeCallMachineEvent.ERROR; error?: Error }
  | {
      type: typeof RealtimeCallMachineEvent.START;
      companyId: string;
      audioRef: React.RefObject<HTMLAudioElement>;
    }
  | {
      type: typeof RealtimeCallMachineEvent.CONNECTED;
      pc: RTCPeerConnection;
      dc: RTCDataChannel;
    }
  | { type: typeof RealtimeCallMachineEvent.STOP }
  | { type: typeof RealtimeCallMachineEvent.MESSAGE; message: string }
  | { type: typeof RealtimeCallMachineEvent.MUTE_TOGGLE };
// | { type: "STOP_CALL" }
// | { type: "RTC_OPEN", pc: RTCPeerConnection, dc: RTCDataChannel }
// | { type: "RTC_ERROR" }
// | { type: "RTC_CLOSE" }
// | { type: "MESSAGE", message: string }
// | { type: "SET_DATA_CHANNEL", dataChannel: RTCDataChannel }
