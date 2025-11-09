import { audioCallMachine } from "@/modules/audio/application/machine/audio-call.machine";
import { useMachine } from "@xstate/react";

export function useAudioCall(audioRef: React.RefObject<HTMLAudioElement>) {
  const [state, send] = useMachine(audioCallMachine)

  const startCall = async () => send({ type: "START_CALL", audioRef })
  const stopCall = () => send({ type: "STOP_CALL" })
  const sendMessage = (message: string) => send({ type: "MESSAGE", message })

  return {
    state,
    startCall,
    stopCall,
    sendMessage
  }
}
