// import { stopAudioStream } from "@/shared/utils/stopAudioStream"
import { assign, fromCallback, fromObservable, fromPromise, setup } from "xstate"
// import { handleAudioWebRtcUseCase } from "../use-cases/handle-audio-webrtc.use-case"
// import { stopPeerConnection } from "@/shared/utils/stopPeerConnection"
import { inject, injectable } from "inversify"
import type { AudioCallMachineContext, AudioCallMachineEvents } from "../../domain/types/audio-call-machine.types"
import { AudioStreamPort } from "@/domain/audio-stream.port"
import { AudioCallMachineState } from "../../domain/enums/audio-call-machine-state.enum"
import { AudioCallMachineEvent } from "../../domain/enums/audio-call-machine-event.enum"
import { AudioWebRtcUseCase } from "../use-cases/audio-webrtc.use-case"

@injectable()
export class AudioCallMachine {
  private machine

  constructor(
    @inject(AudioStreamPort) private readonly audioStream: AudioStreamPort,
    @inject(AudioWebRtcUseCase) private readonly audioWebRtcUseCase: AudioWebRtcUseCase
  ) {
    this.machine = setup({
      types: {} as {
        events: AudioCallMachineEvents,
        context: AudioCallMachineContext
      },
      guards: {},
      actions: {},
      actors: {
        handleMediaStream: fromPromise(() => this.audioStream.asPromise()),
        handleAudioWebRtc: fromCallback<any, { audioStream: MediaStream, companyId: string, audioRef: React.RefObject<HTMLAudioElement> }, any>(({ sendBack, input }) => {
          this.audioWebRtcUseCase.execute({
            ...input,
            onConnected: (pc, dc) => sendBack({ type: "CONNECTED", pc, dc }),
            onError: (error) => sendBack({ type: "ERROR", error }),
            onClosed: () => sendBack({ type: "CLOSED" }),
            onMessage: () => sendBack({ type: "MESSAGE" }),
          })
        })
      },
    }).createMachine({
      id: "AUDIO_CALL",
      entry: () => console.log("Audio call machine booted"),
      initial: AudioCallMachineState.IDLE,
      on: {
        [AudioCallMachineEvent.ERROR]: {
          target: `.${AudioCallMachineState.IDLE}`,
          actions: ({ event }) => {
            console.log("An error occurred during the audio call", event.error)
          }
        },
        [AudioCallMachineEvent.STOP]: {
          target: `.${AudioCallMachineState.IDLE}`,
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
        [AudioCallMachineState.IDLE]: {
          on: {
            [AudioCallMachineEvent.START]: {
              target: AudioCallMachineState.INITIALIZING,
              actions: assign({
                companyId: ({ event }) => event.companyId,
                audioRef: ({ event }) => event.audioRef
              })
            }
          }
        },
        [AudioCallMachineState.INITIALIZING]: {
          invoke: {
            src: "handleMediaStream",
            onDone: {
              target: AudioCallMachineState.CALLING,
              actions: assign({
                audioStream: ({ event }) => event.output
              })
            }
          }
        },
        [AudioCallMachineState.CALLING]: {
          initial: AudioCallMachineState.CONNECTING,
          invoke: {
            input: ({ context }) => ({
              audioStream: context.audioStream!,
              companyId: context.companyId!,
              audioRef: context.audioRef!
            }),
            src: "handleAudioWebRtc"
          },
          states: {
            [AudioCallMachineState.CONNECTING]: {
              entry: () => console.log("Connecting to WebRTC..."),
              on: {
                [AudioCallMachineEvent.CONNECTED]: {
                  target: AudioCallMachineState.CONNECTED
                }
              }
            },
            [AudioCallMachineState.CONNECTED]: {
              entry: () => console.log("WebRTC connected!"),
              on: {
                [AudioCallMachineEvent.MESSAGE]: {

                },
                [AudioCallMachineEvent.CLOSED]: {

                }
              }
            }
          }
        }
      }
    })
  }

  public getMachine() {
    return this.machine
  }
}



// export const audioCallMachine = setup({
//   guards: {
//     canStopCall: ({ context, event }) => !!context.audioStream && event.type === "STOP_CALL"
//   },
//   actors: {
//     aquireUserMedia: fromPromise(getAudioStream),
//     handleDataChannelEvents: fromCallback(({ input, sendBack }) => {
//       const { pc } = input as { pc: RTCPeerConnection }
//       const dc = pc.createDataChannel("oai-events");

//       // Listen for server events
//       dc.addEventListener("message", (e) => {
//         const event = JSON.parse(e.data);
//         console.log(event);
//       });

//       dc.addEventListener("open", () => {
//         console.log("Data channel is open");
//         sendBack({ type: "SET_DATA_CHANNEL", dataChannel: dc });
//       });

//       // Save the data channel in the context by sending an event
//     }),
//     handleAudioWebRtc: fromCallback(({ input, sendBack }) => {
//       const { audioStream, audioRef, companyId } = input as { audioStream: MediaStream, companyId: string, audioRef: React.RefObject<HTMLAudioElement> }
//       const { pc, dc } = handleAudioWebRtcUseCase(companyId, audioStream, audioRef, (error) => {
//         console.error("WebRTC error:", error)
//         sendBack({ type: "RTC_ERROR" })
//       })

//       pc.onconnectionstatechange = () => {
//         if (pc.connectionState === "connected") {
//           sendBack({ type: "RTC_OPEN", pc, dc })
//         }

//         if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
//           sendBack({ type: "RTC_ERROR" })
//         }

//         if (pc.connectionState === "closed") {
//           sendBack({ type: "RTC_CLOSE" })
//         }
//       }

//       dc.onmessage = (event) => {
//         console.log("Received message on data channel:", event.data)
//       }
//     })
//   },
//   actions: {
//     stopAudioStream: assign(({ context }) => {
//       console.log('Stopping audio stream')
//       if (context.audioStream) {
//         stopAudioStream(context.audioStream)
//         context.audioStream = undefined
//       }
//       return {
//         audioStream: undefined
//       }
//     }),
//     setCompanyId: assign(({ context, event }) => {
//       if (event.type === "START_CALL") {
//         return {
//           ...context,
//           companyId: event.companyId
//         }
//       }
//       return context
//     }),
//     // Ajoute l'action pour setter audioRef dans le contexte lors de START_CALL
//     setAudioRef: assign(({ context, event }) => {
//       if (event.type === "START_CALL") {
//         return {
//           ...context,
//           audioRef: event.audioRef
//         }
//       }
//       return context
//     }),
//     // Ajoute l'action pour setter peerConnection dans le contexte lors de RTC_OPEN
//     setWebRtc: assign(({ context, event }) => {
//       if (event.type === "RTC_OPEN") {
//         return {
//           ...context,
//           peerConnection: event.pc,
//           dataChannel: event.dc
//         }
//       }
//       return context
//     }),
//     stopPeerConnection: assign(({ context }) => {
//       console.log('Stopping peer connection')
//       if (context.peerConnection) {
//         stopPeerConnection(context.peerConnection)
//       }
//       if (context.dataChannel) {
//         context.dataChannel.close()
//       }
//       return {
//         ...context,
//         peerConnection: undefined
//       }
//     })
//   }
// }).createMachine({
//   id: "audioCall",
//   initial: "idle",
//   entry: () => {
//     console.log("Audio call machine started")
//   },
//   on: {
//     STOP_CALL: {
//       guard: 'canStopCall',
//       target: ".ending"
//     }
//   },
//   states: {
//     idle: {
//       on: {
//         START_CALL: {
//           target: "aquiringMedia",
//           actions: [
//             "setAudioRef",
//             "setCompanyId"
//           ]
//         }
//       }
//     },
//     aquiringMedia: {
//       invoke: {
//         src: "aquireUserMedia",
//         onDone: {
//           target: "callReady",
//           actions: assign({
//             audioStream: ({ event }) => event.output
//           })
//         },
//         onError: {
//           target: "failure"
//         }
//       }
//     },
//     callReady: {
//       initial: "connecting",
//       invoke: {
//         input: ({ context }) => ({ audioStream: context.audioStream!, audioRef: context.audioRef!, companyId: context.companyId! }),
//         src: "handleAudioWebRtc",
//       },
//       on: {
//         RTC_ERROR: "#audioCall.failure",
//         RTC_CLOSE: "#audioCall.failure"
//       },
//       states: {
//         connecting: {
//           on: {
//             RTC_OPEN: {
//               target: "streaming",
//               actions: "setWebRtc"
//             },
//           }
//         },
//         streaming: {
//           invoke: {
//             input: ({ context }) => ({ pc: context.peerConnection! }),
//             src: "handleDataChannelEvents",
//             onError: {
//               target: "#audioCall.failure"
//             }
//           },
//           on: {
//             MESSAGE: {
//               guard: ({ context }) => context.dataChannel?.readyState === "open",
//               actions: ({ event, context }) => {
//                 console.log("Received message on data channel:", event.message)

//                 // Only send if dataChannel exists and is open
//                 context.dataChannel!.send(JSON.stringify({
//                   type: "conversation.item.create",
//                   item: {
//                     type: "message",
//                     role: "user",
//                     content: [
//                       {
//                         type: "input_text",
//                         text: event.message,
//                       },
//                     ],
//                   },
//                 }));

//                 context.dataChannel!.send(JSON.stringify({
//                   type: "response.create",
//                 }));
//               }
//             }
//           }
//         }
//       },
//     },
//     failure: {
//       entry: assign(({ event, context }) => {
//         if ('error' in event) {
//           console.log(event.error)
//         }
//         return context
//       }),
//       always: {
//         target: "ending"
//       }
//     },
//     ending: {
//       exit: [
//         'stopPeerConnection',
//         'stopAudioStream'
//       ],
//       always: {
//         target: "idle"
//       }
//     }
//   }
// })
