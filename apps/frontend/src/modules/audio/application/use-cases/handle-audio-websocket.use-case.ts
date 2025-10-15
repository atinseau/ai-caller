import { ApiWebSocket } from "@/adapters/api-websocket";


export function handleAudioWebSocketUseCase(audioStream: MediaStream) {
  const audioWebSocket = new ApiWebSocket('/ws/audio')
  const mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' })

  console.log('Audio WebSocket initialized:', mediaRecorder)

  mediaRecorder.addEventListener('dataavailable', (event) => {
    console.log('Audio data available:', event.data)
  })

  mediaRecorder.addEventListener('start', () => {
    console.log('MediaRecorder started')
  })

  mediaRecorder.addEventListener('stop', () => {
    console.log('MediaRecorder stopped')
  })

  mediaRecorder.start(200) // Collect 1 second of audio data

  return audioWebSocket
}
