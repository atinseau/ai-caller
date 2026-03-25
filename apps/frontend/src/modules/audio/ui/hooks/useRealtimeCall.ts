import { useReducer, useRef } from "react";
import { useServices } from "@/app/providers/ServicesProvider";

export type CallStatus = "idle" | "initializing" | "connecting" | "connected";

type CallState = {
  status: CallStatus;
  muted: boolean;
  roomId: string | null;
};

type CallAction =
  | { type: "START" }
  | { type: "CONNECTING"; roomId: string }
  | { type: "CONNECTED" }
  | { type: "STOP" }
  | { type: "ERROR" }
  | { type: "MUTE_TOGGLE" };

const initialState: CallState = {
  status: "idle",
  muted: false,
  roomId: null,
};

function reducer(state: CallState, action: CallAction): CallState {
  switch (action.type) {
    case "START":
      return { ...state, status: "initializing" };
    case "CONNECTING":
      return { ...state, status: "connecting", roomId: action.roomId };
    case "CONNECTED":
      return { ...state, status: "connected" };
    case "STOP":
    case "ERROR":
      return initialState;
    case "MUTE_TOGGLE":
      return { ...state, muted: !state.muted };
    default:
      return state;
  }
}

export function useRealtimeCall() {
  const { audioCapture, audioPlayback, realtimeWsRoom } = useServices();
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);

  const start = async (companyId: string, isTest?: boolean) => {
    dispatch({ type: "START" });
    try {
      // Initialize playback context
      audioPlayback.init();

      // Create room on backend — triggers provider connection
      const { roomId } = await realtimeWsRoom.createRoom(companyId, isTest);
      dispatch({ type: "CONNECTING", roomId });

      // Connect WebSocket for audio relay
      const ws = realtimeWsRoom.connectAudioWs(
        roomId,
        (base64) => {
          audioPlayback.playChunk(base64);
        },
        () => {
          // Provider detected user speech — clear pending playback
          audioPlayback.clearBuffer();
        },
        () => {
          // Server closed the WS — clean up
          audioCapture.stop();
          audioPlayback.close();
          wsRef.current = null;
          dispatch({ type: "STOP" });
        },
      );
      wsRef.current = ws;

      // Wait for WS open before starting capture
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error("WebSocket connection failed"));
      });

      // Start mic capture — send chunks over WS
      await audioCapture.start((base64) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "audio", audio: base64 }));
        }
      });

      dispatch({ type: "CONNECTED" });
    } catch {
      audioCapture.stop();
      audioPlayback.close();
      wsRef.current?.close();
      wsRef.current = null;
      dispatch({ type: "ERROR" });
    }
  };

  const stop = () => {
    audioCapture.stop();
    audioPlayback.close();
    wsRef.current?.close();
    wsRef.current = null;
    dispatch({ type: "STOP" });
  };

  const toggleMute = () => {
    const newMuted = !state.muted;
    audioCapture.setMuted(newMuted);
    dispatch({ type: "MUTE_TOGGLE" });
  };

  const sendMessage = (message: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (message === "stop") {
      audioPlayback.clearBuffer();
      return;
    }

    ws.send(JSON.stringify({ type: "text", text: message }));
  };

  return { state, start, stop, toggleMute, sendMessage };
}
