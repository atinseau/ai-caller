import { setup, fromPromise, assign, fromCallback } from "xstate"
import { getAudioStream } from "@/adapters/get-audio-stream.client"
import { stopAudioStream } from "@/shared/utils/stopAudioStream"
import { handleAudioWebSocketUseCase } from "@/modules/audio/application/use-cases/handle-audio-websocket.use-case"

export const audioCallMachine = setup({
  types: {} as {
    context: {
      audioStream: MediaStream | null
    },
    events:
    | { type: "START_CALL" }
    | { type: "STOP_CALL" }
    | { type: "WS_OPEN" }
    | { type: "WS_ERROR" }
    | { type: "WS_CLOSE" }
  },
  guards: {
    canStopCall: ({ context, event }) => !!context.audioStream && event.type === "STOP_CALL"
  },
  actors: {
    aquireUserMedia: fromPromise(getAudioStream),
    handleAudioWebSocket: fromCallback(({ input, sendBack }) => {
      const { audioStream } = input as { audioStream: MediaStream }
      const webSocket = handleAudioWebSocketUseCase(audioStream)

      webSocket.once('open', () => sendBack({ type: 'WS_OPEN' }))
      webSocket.once('error', () => sendBack({ type: 'WS_ERROR' }))
      webSocket.once('close', () => sendBack({ type: 'WS_CLOSE' }))

      return () => {
        console.log('Closing audio WebSocket')
        webSocket.close()
      }
    })
  },
  actions: {
    stopAudioStream: assign(({ context }) => {
      console.log('Stopping audio stream')
      if (context.audioStream) {
        stopAudioStream(context.audioStream)
        context.audioStream = null
      }

      return {
        audioStream: null
      }
    })
  }
}).createMachine({
  id: "audioCall",
  initial: "idle",
  context: {
    audioStream: null
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
        START_CALL: "aquiringMedia"
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
        input: ({ context }) => ({ audioStream: context.audioStream! }),
        src: "handleAudioWebSocket"
      },
      on: {
        WS_ERROR: "#audioCall.failure",
        WS_CLOSE: "#audioCall.failure"
      },
      states: {
        connecting: {
          on: {
            WS_OPEN: "streaming",
          }
        },
        streaming: {}
      }
    },
    failure: {
      type: "final"
    },
    ending: {
      entry: "stopAudioStream",
      always: {
        target: "idle"
      }
    }
  }
})
