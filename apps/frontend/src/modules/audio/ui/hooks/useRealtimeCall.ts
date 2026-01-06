import { useMachine } from "@xstate/react";
import { container } from "@/infrastructure/di/container";
import { RealtimeCallMachine } from "../../application/machine/realtime-call.machine";
import { RealtimeCallMachineEvent } from "../../domain/enums/realtime-call-machine-event.enum";

export function useRealtimeCall(audioRef: React.RefObject<HTMLAudioElement>) {
  const realtimeCallMachine = container.get(RealtimeCallMachine);
  const [state, send] = useMachine(realtimeCallMachine.getMachine());

  const start = async (companyId: string) =>
    send({ type: RealtimeCallMachineEvent.START, companyId, audioRef });
  const stop = () => send({ type: RealtimeCallMachineEvent.STOP });
  const sendMessage = (message: string) =>
    send({ type: RealtimeCallMachineEvent.MESSAGE, message });

  return {
    sendMessage,
    state,
    start,
    stop,
  };
}
