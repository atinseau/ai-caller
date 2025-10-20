import { audioCallMachine } from "@/modules/audio/application/machine/audio-call.machine";
import { useMachine } from "@xstate/react";

export function useAudioCall() {
  const [state, send] = useMachine(audioCallMachine)

  const startCall = () => send({ type: "START_CALL" })
  const stopCall = () => send({ type: "STOP_CALL" })

  return {
    state,
    startCall,
    stopCall
  }
}
