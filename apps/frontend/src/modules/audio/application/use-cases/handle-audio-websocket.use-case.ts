import { ApiWebSocket } from "@/adapters/api-websocket";


export function handleAudioWebSocketUseCase(audioStream: MediaStream) {
  const audioWebSocket = new ApiWebSocket('/ws/audio')

  console.log('Audio WebSocket initialized:', audioWebSocket, audioStream)

  return audioWebSocket
}
