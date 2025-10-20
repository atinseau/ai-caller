
export interface AudioInputPort {
  start(stream: MediaStream, onAudioChunk: (pcmChunk: ArrayBuffer) => void): Promise<void>;
  stop(): Promise<void>;
}
