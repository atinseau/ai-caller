import { int16BufferToBase64 } from "@/shared/utils/audio-encoding";

export interface AudioCapturePort {
  start(onChunk: (base64: string) => void): Promise<void>;
  stop(): void;
  setMuted(muted: boolean): void;
}

export class AudioCaptureService implements AudioCapturePort {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private legacyProcessor: ScriptProcessorNode | null = null;

  async start(onChunk: (base64: string) => void): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 24000 },
        sampleSize: { ideal: 16 },
      },
    });
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    if (typeof AudioWorkletNode !== "undefined") {
      await this.startWorklet(source, onChunk);
    } else {
      this.startLegacy(source, onChunk);
    }
  }

  stop(): void {
    this.workletNode?.disconnect();
    this.legacyProcessor?.disconnect();
    if (this.mediaStream) {
      for (const t of this.mediaStream.getTracks()) t.stop();
    }
    this.audioContext?.close();
    this.workletNode = null;
    this.legacyProcessor = null;
    this.mediaStream = null;
    this.audioContext = null;
  }

  setMuted(muted: boolean): void {
    if (this.mediaStream) {
      for (const t of this.mediaStream.getAudioTracks()) t.enabled = !muted;
    }
  }

  private async startWorklet(
    source: MediaStreamAudioSourceNode,
    onChunk: (base64: string) => void,
  ): Promise<void> {
    if (!this.audioContext) return;

    await this.audioContext.audioWorklet.addModule("/audio-capture-worklet.js");
    this.workletNode = new AudioWorkletNode(
      this.audioContext,
      "audio-capture-processor",
    );

    this.workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      onChunk(int16BufferToBase64(e.data));
    };

    source.connect(this.workletNode);
    this.workletNode.connect(this.audioContext.destination);
  }

  /** Fallback for browsers without AudioWorklet support */
  private startLegacy(
    source: MediaStreamAudioSourceNode,
    onChunk: (base64: string) => void,
  ): void {
    if (!this.audioContext) return;

    this.legacyProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.legacyProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
      const float32 = e.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        int16[i] = Math.max(
          -32768,
          Math.min(32767, Math.floor(float32[i] * 32768)),
        );
      }
      onChunk(int16BufferToBase64(int16.buffer));
    };

    source.connect(this.legacyProcessor);
    this.legacyProcessor.connect(this.audioContext.destination);
  }
}
