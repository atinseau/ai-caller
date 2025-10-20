import { ApiWebSocket } from "@/adapters/api-websocket";
import { AudioInput } from "../../infrastructure/audio-input";


export function handleAudioWebSocketUseCase(audioStream: MediaStream) {
  const audioWebSocket = new ApiWebSocket('/audio/stream/ws');
  const audioInput = new AudioInput()

  audioInput.start(audioStream, (chunk) => {
    if (!audioWebSocket.isOpen()) {
      return
    }
    audioWebSocket.send(chunk)
  })

  // Gestion de la fermeture du WebSocket et nettoyage audio
  audioWebSocket.once('close', () => {
    console.log('Audio WebSocket closed, audio context cleaned up');
    audioInput.stop();
  })

  return audioWebSocket;
}
