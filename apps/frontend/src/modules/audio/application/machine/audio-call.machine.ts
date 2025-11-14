import { getAudioStream } from "@/adapters/get-audio-stream"
import { stopAudioStream } from "@/shared/utils/stopAudioStream"
import { assign, fromCallback, fromPromise, setup } from "xstate"
import { handleAudioWebRtcUseCase } from "../use-cases/handle-audio-webrtc.use-case"
import { stopPeerConnection } from "@/shared/utils/stopPeerConnection"

export const audioCallMachine = setup({
  types: {} as {
    context: {
      audioStream?: MediaStream,
      peerConnection?: RTCPeerConnection,
      dataChannel?: RTCDataChannel,
      audioRef?: React.RefObject<HTMLAudioElement>,
      companyId?: string
    },
    events:
    | { type: "START_CALL", audioRef: React.RefObject<HTMLAudioElement>, companyId: string }
    | { type: "STOP_CALL" }
    | { type: "RTC_OPEN", pc: RTCPeerConnection, dc: RTCDataChannel }
    | { type: "RTC_ERROR" }
    | { type: "RTC_CLOSE" }
    | { type: "MESSAGE", message: string }
    | { type: "SET_DATA_CHANNEL", dataChannel: RTCDataChannel }
  },
  guards: {
    canStopCall: ({ context, event }) => !!context.audioStream && event.type === "STOP_CALL"
  },
  actors: {
    aquireUserMedia: fromPromise(getAudioStream),
    handleDataChannelEvents: fromCallback(({ input, sendBack }) => {
      const { pc } = input as { pc: RTCPeerConnection }
      const dc = pc.createDataChannel("oai-events");

      // Listen for server events
      dc.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        console.log(event);
      });

      dc.addEventListener("open", () => {
        console.log("Data channel is open");
        sendBack({ type: "SET_DATA_CHANNEL", dataChannel: dc });
      });

      // Save the data channel in the context by sending an event
    }),
    handleAudioWebRtc: fromCallback(({ input, sendBack }) => {
      const { audioStream, audioRef, companyId } = input as { audioStream: MediaStream, companyId: string, audioRef: React.RefObject<HTMLAudioElement> }
      const { pc, dc } = handleAudioWebRtcUseCase(companyId, audioStream, audioRef, (error) => {
        console.error("WebRTC error:", error)
        sendBack({ type: "RTC_ERROR" })
      })

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          sendBack({ type: "RTC_OPEN", pc, dc })
        }

        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          sendBack({ type: "RTC_ERROR" })
        }

        if (pc.connectionState === "closed") {
          sendBack({ type: "RTC_CLOSE" })
        }
      }

      dc.onmessage = (event) => {
        console.log("Received message on data channel:", event.data)
      }
    })
  },
  actions: {
    stopAudioStream: assign(({ context }) => {
      console.log('Stopping audio stream')
      if (context.audioStream) {
        stopAudioStream(context.audioStream)
        context.audioStream = undefined
      }
      return {
        audioStream: undefined
      }
    }),
    setCompanyId: assign(({ context, event }) => {
      if (event.type === "START_CALL") {
        return {
          ...context,
          companyId: event.companyId
        }
      }
      return context
    }),
    // Ajoute l'action pour setter audioRef dans le contexte lors de START_CALL
    setAudioRef: assign(({ context, event }) => {
      if (event.type === "START_CALL") {
        return {
          ...context,
          audioRef: event.audioRef
        }
      }
      return context
    }),
    // Ajoute l'action pour setter peerConnection dans le contexte lors de RTC_OPEN
    setWebRtc: assign(({ context, event }) => {
      if (event.type === "RTC_OPEN") {
        return {
          ...context,
          peerConnection: event.pc,
          dataChannel: event.dc
        }
      }
      return context
    }),
    stopPeerConnection: assign(({ context }) => {
      console.log('Stopping peer connection')
      if (context.peerConnection) {
        stopPeerConnection(context.peerConnection)
      }
      if (context.dataChannel) {
        context.dataChannel.close()
      }
      return {
        ...context,
        peerConnection: undefined
      }
    })
  }
}).createMachine({
  id: "audioCall",
  initial: "idle",
  entry: () => {
    console.log("Audio call machine started")
  },
  on: {
    STOP_CALL: {
      guard: 'canStopCall',
      target: ".ending"
    }
  },
  states: {
    idle: {
      on: {
        START_CALL: {
          target: "aquiringMedia",
          actions: [
            "setAudioRef",
            "setCompanyId"
          ]
        }
      }
    },
    aquiringMedia: {
      invoke: {
        src: "aquireUserMedia",
        onDone: {
          target: "callReady",
          actions: assign({
            audioStream: ({ event }) => event.output
          })
        },
        onError: {
          target: "failure"
        }
      }
    },
    callReady: {
      initial: "connecting",
      invoke: {
        input: ({ context }) => ({ audioStream: context.audioStream!, audioRef: context.audioRef!, companyId: context.companyId! }),
        src: "handleAudioWebRtc",
      },
      on: {
        RTC_ERROR: "#audioCall.failure",
        RTC_CLOSE: "#audioCall.failure"
      },
      states: {
        connecting: {
          on: {
            RTC_OPEN: {
              target: "streaming",
              actions: "setWebRtc"
            },
          }
        },
        streaming: {
          invoke: {
            input: ({ context }) => ({ pc: context.peerConnection! }),
            src: "handleDataChannelEvents",
            onError: {
              target: "#audioCall.failure"
            }
          },
          on: {
            MESSAGE: {
              guard: ({ context }) => context.dataChannel?.readyState === "open",
              actions: ({ event, context }) => {
                console.log("Received message on data channel:", event.message)

                // Only send if dataChannel exists and is open
                context.dataChannel!.send(JSON.stringify({
                  type: "conversation.item.create",
                  item: {
                    type: "message",
                    role: "user",
                    content: [
                      {
                        type: "input_text",
                        text: event.message,
                      },
                    ],
                  },
                }));

                context.dataChannel!.send(JSON.stringify({
                  type: "response.create",
                }));
              }
            }
          }
        }
      },
    },
    failure: {
      entry: assign(({ event, context }) => {
        if ('error' in event) {
          console.log(event.error)
        }
        return context
      }),
      always: {
        target: "ending"
      }
    },
    ending: {
      exit: [
        'stopPeerConnection',
        'stopAudioStream'
      ],
      always: {
        target: "idle"
      }
    }
  }
})
