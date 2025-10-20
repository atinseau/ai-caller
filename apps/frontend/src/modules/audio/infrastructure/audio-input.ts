import type { AudioInputPort } from "../domain/interfaces/audio-input.port";
import pcmProcessorWorkletUrl from "./pcm-processor?url";


export class AudioInput implements AudioInputPort {
  declare private audioCtx: AudioContext;
  declare private source: MediaStreamAudioSourceNode;
  declare private worklet: AudioWorkletNode

  async start(stream: MediaStream, onAudioChunk: (pcmChunk: ArrayBuffer) => void) {
    this.audioCtx = new AudioContext({ sampleRate: 48000 });
    await this.audioCtx.audioWorklet.addModule(pcmProcessorWorkletUrl)
    this.source = this.audioCtx.createMediaStreamSource(stream);
    this.worklet = new AudioWorkletNode(this.audioCtx, "pcm-processor");
    this.source.connect(this.worklet);
    const mute = this.audioCtx.createGain();
    mute.gain.value = 0;
    this.worklet.connect(mute);
    mute.connect(this.audioCtx.destination);
    this.worklet.port.onmessage = (event) => onAudioChunk(event.data);
  }

  async stop() {
    this.audioCtx.close();
    this.source.disconnect();
    this.worklet.disconnect();
  }
}
