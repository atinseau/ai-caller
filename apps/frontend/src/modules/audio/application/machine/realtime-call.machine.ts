// import { stopAudioStream } from "@/shared/utils/stopAudioStream"

// import { handleAudioWebRtcUseCase } from "../use-cases/handle-audio-webrtc.use-case"
// import { stopPeerConnection } from "@/shared/utils/stopPeerConnection"
import { inject, injectable } from "inversify";
import { assign, fromCallback, fromPromise, setup } from "xstate";
import { AudioStreamPort } from "@/domain/audio-stream.port";
import { RealtimeCallMachineEvent } from "../../domain/enums/realtime-call-machine-event.enum";
import { RealtimeCallMachineState } from "../../domain/enums/realtime-call-machine-state.enum";
import type {
  RealtimeCallMachineContext,
  RealtimeCallMachineEvents,
} from "../../domain/types/realtime-call-machine.types";
import { RealtimeWebRtcUseCase } from "../use-cases/realtime-webrtc.use-case";

@injectable()
export class RealtimeCallMachine {
  private readonly name = "REALTIME_CALL_MACHINE";

  private machine;

  constructor(
    @inject(AudioStreamPort) private readonly audioStream: AudioStreamPort,
    @inject(RealtimeWebRtcUseCase) private readonly realtimeWebRtcUseCase: RealtimeWebRtcUseCase
  ) {
    this.machine = setup({
      types: {} as {
        events: RealtimeCallMachineEvents,
        context: RealtimeCallMachineContext
      },
      guards: {},
      actions: {},
      actors: {
        handleMediaStream: fromPromise(() => this.audioStream.asPromise()),
        handleRealtimeWebRtc: fromCallback<any, { audioStream: MediaStream, companyId: string, audioRef: React.RefObject<HTMLAudioElement> }, any>(({ sendBack, input }) => {
          this.realtimeWebRtcUseCase.execute({
            ...input,
            onConnected: (pc, dc) => sendBack({ type: "CONNECTED", pc, dc }),
            onError: (error) => sendBack({ type: "ERROR", error }),
            onClosed: () => sendBack({ type: "CLOSED" }),
            onMessage: () => sendBack({ type: "MESSAGE" }),
          })
        }),
        handleDataChannelEvents: fromCallback<any, { dataChannel: RTCDataChannel }>(({ sendBack, input }) => {
          input.dataChannel.addEventListener('message', (event) => {
            console.log('Data channel message received', event.data)
          })
        })
      },
    }).createMachine({
      id: this.name,
      entry: () => console.log("Audio call machine booted"),
      initial: RealtimeCallMachineState.IDLE,
      on: {
        [RealtimeCallMachineEvent.ERROR]: {
          target: `.${RealtimeCallMachineState.IDLE}`,
          actions: ({ event }) => {
            console.log("An error occurred during the audio call", event.error)
          }
        },
        [RealtimeCallMachineEvent.STOP]: {
          target: `.${RealtimeCallMachineState.IDLE}`,
          actions: ({ context }) => {
            console.log("Stopping audio call")

            if (context.audioStream) {
              context.audioStream.getTracks().forEach((track) => track.stop())
            }

            if (context.dataChannel) {
              context.dataChannel.close()
            }

            if (context.peerConnection) {
              context.peerConnection.close()
            }
          }
        }
      },
      states: {
        [RealtimeCallMachineState.IDLE]: {
          on: {
            [RealtimeCallMachineEvent.START]: {
              target: RealtimeCallMachineState.INITIALIZING,
              actions: assign({
                companyId: ({ event }) => event.companyId,
                audioRef: ({ event }) => event.audioRef
              })
            }
          }
        },
        [RealtimeCallMachineState.INITIALIZING]: {
          invoke: {
            src: "handleMediaStream",
            onDone: {
              target: RealtimeCallMachineState.CALLING,
              actions: assign({
                audioStream: ({ event }) => event.output
              })
            }
          }
        },
        [RealtimeCallMachineState.CALLING]: {
          initial: RealtimeCallMachineState.CONNECTING,
          invoke: {
            input: ({ context }) => ({
              audioStream: context.audioStream!,
              companyId: context.companyId!,
              audioRef: context.audioRef!
            }),
            src: "handleRealtimeWebRtc"
          },
          states: {
            [RealtimeCallMachineState.CONNECTING]: {
              entry: () => console.log("Connecting to WebRTC..."),
              on: {
                [RealtimeCallMachineEvent.CONNECTED]: {
                  actions: assign({
                    peerConnection: ({ event }) => event.pc,
                    dataChannel: ({ event }) => event.dc
                  }),
                  target: RealtimeCallMachineState.CONNECTED
                }
              }
            },
            [RealtimeCallMachineState.CONNECTED]: {
              entry: () => console.log("WebRTC connected!"),
              invoke: {
                src: "handleDataChannelEvents",
                input: ({ context }) => ({ dataChannel: context.dataChannel! }),
                onError: {
                  actions: ({ event, self }) => {
                    self.send({ type: RealtimeCallMachineEvent.ERROR, error: event.error as Error })
                  }
                }
              },
              on: {
                [RealtimeCallMachineEvent.MESSAGE]: {
                  guard: ({ context }) => context.dataChannel?.readyState === "open",
                  actions: ({ context, event }) => {

                    if (event.message === "stop") {
                      context.dataChannel!.send(JSON.stringify({
                        type: "output_audio_buffer.clear"
                      }))
                      context.dataChannel!.send(JSON.stringify({
                        // type: ""
                      }))
                      return
                    }

                    context.dataChannel!.send(JSON.stringify({
                      type: "conversation.item.create",
                      item: {
                        type: "message",
                        role: "user",
                        content: [
                          {
                            type: "input_text",
                            text: event.message
                          }
                        ]
                      }
                    }))

                    context.dataChannel!.send(JSON.stringify({
                      type: "response.create",
                    }));
                  }
                },
                [RealtimeCallMachineEvent.CLOSED]: {}
              }
            }
          }
        }
      }
    })
  }

  public getMachine() {
    return this.machine;
  }
}
