import { useMachine } from "@xstate/react";
import { AudioCallMachine } from "../../application/machine/audio-call.machine";
import { container } from "@/infrastructure/di/container";
import { AudioCallMachineEvent } from "../../domain/enums/audio-call-machine-event.enum";

export function useAudioCall(audioRef: React.RefObject<HTMLAudioElement>) {
  const audioCallMachine = container.get(AudioCallMachine)
  const [state, send] = useMachine(audioCallMachine.getMachine())

  const start = async (companyId: string) => send({ type: AudioCallMachineEvent.START, companyId, audioRef })
  const stop = () => send({ type: AudioCallMachineEvent.STOP })

  return {
    state,
    start,
    stop
  }
}
