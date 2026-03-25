import { base64ToFloat32 } from "@/shared/utils/audio-encoding";

export interface AudioPlaybackPort {
  init(): void;
  playChunk(base64: string): void;
  clearBuffer(): void;
  close(): void;
}

export class AudioPlaybackService implements AudioPlaybackPort {
  private audioContext: AudioContext | null = null;
  private nextPlayTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();

  init(): void {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.nextPlayTime = this.audioContext.currentTime;
  }

  playChunk(base64: string): void {
    if (!this.audioContext) return;

    const float32 = base64ToFloat32(base64);

    const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
    };

    const startTime = Math.max(
      this.audioContext.currentTime,
      this.nextPlayTime,
    );
    source.start(startTime);
    this.nextPlayTime = startTime + buffer.duration;
  }

  clearBuffer(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        /* source may not have started yet */
      }
    }
    this.activeSources.clear();

    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
  }

  close(): void {
    this.clearBuffer();
    this.audioContext?.close();
    this.audioContext = null;
  }
}
