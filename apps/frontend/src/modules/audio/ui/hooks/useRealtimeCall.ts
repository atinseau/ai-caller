import { type RefObject, useReducer } from "react";
import { useServices } from "@/app/providers/ServicesProvider";
import { connectWebRtc } from "../../application/connect-webrtc";

export type CallStatus = "idle" | "initializing" | "connecting" | "connected";

type CallState = {
  status: CallStatus;
  muted: boolean;
  roomId: string | null;
  audioStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  dataChannel: RTCDataChannel | null;
};

type CallAction =
  | { type: "START" }
  | { type: "AUDIO_READY"; audioStream: MediaStream }
  | {
      type: "CONNECTED";
      pc: RTCPeerConnection;
      dc: RTCDataChannel;
      roomId: string;
    }
  | { type: "STOP" }
  | { type: "ERROR" }
  | { type: "MUTE_TOGGLE" };

const initialState: CallState = {
  status: "idle",
  muted: false,
  roomId: null,
  audioStream: null,
  peerConnection: null,
  dataChannel: null,
};

function reducer(state: CallState, action: CallAction): CallState {
  switch (action.type) {
    case "START":
      return { ...state, status: "initializing" };
    case "AUDIO_READY":
      return {
        ...state,
        status: "connecting",
        audioStream: action.audioStream,
      };
    case "CONNECTED":
      return {
        ...state,
        status: "connected",
        peerConnection: action.pc,
        dataChannel: action.dc,
        roomId: action.roomId,
      };
    case "STOP":
    case "ERROR":
      return initialState;
    case "MUTE_TOGGLE": {
      const muted = !state.muted;
      for (const t of state.audioStream?.getAudioTracks() ?? [])
        t.enabled = !muted;
      return { ...state, muted };
    }
    default:
      return state;
  }
}

function cleanup(
  audioStream: MediaStream | null,
  peerConnection: RTCPeerConnection | null,
  dataChannel: RTCDataChannel | null,
) {
  for (const t of audioStream?.getTracks() ?? []) t.stop();
  dataChannel?.close();
  peerConnection?.close();
}

export function useRealtimeCall(audioRef: RefObject<HTMLAudioElement | null>) {
  const { audioStream: audioStreamService, realtimeRoom } = useServices();
  const [state, dispatch] = useReducer(reducer, initialState);

  const start = async (companyId: string) => {
    dispatch({ type: "START" });
    try {
      const stream = await audioStreamService.asPromise();
      dispatch({ type: "AUDIO_READY", audioStream: stream });

      const { pc, dc, roomId } = await connectWebRtc({
        companyId,
        audioStream: stream,
        audioRef,
        realtimeRoom,
      });

      dc.addEventListener("close", () => {
        cleanup(stream, pc, dc);
        dispatch({ type: "STOP" });
      });

      dispatch({ type: "CONNECTED", pc, dc, roomId });
    } catch (_error) {
      dispatch({ type: "ERROR" });
    }
  };

  const stop = () => {
    cleanup(state.audioStream, state.peerConnection, state.dataChannel);
    dispatch({ type: "STOP" });
  };

  const toggleMute = () => dispatch({ type: "MUTE_TOGGLE" });

  const sendMessage = (message: string) => {
    if (!state.dataChannel || state.dataChannel.readyState !== "open") return;

    if (message === "stop") {
      state.dataChannel.send(
        JSON.stringify({ type: "output_audio_buffer.clear" }),
      );
      state.dataChannel.send(JSON.stringify({}));
      return;
    }

    state.dataChannel.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: message }],
        },
      }),
    );
    state.dataChannel.send(JSON.stringify({ type: "response.create" }));
  };

  return { state, start, stop, toggleMute, sendMessage };
}
