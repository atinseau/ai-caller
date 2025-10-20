class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._frameSize = Math.round(((globalThis as any).sampleRate ?? 48000) / 5); // ~200 ms based on actual sampleRate
  }

  process(inputs: Float32Array[][]) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const numChannels = input.length;
    const frames = input[0].length;
    const pcm16 = new Int16Array(frames);

    for (let i = 0; i < frames; i++) {
      let mixed = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        mixed += input[ch][i] || 0;
      }
      const s = Math.max(-1, Math.min(1, mixed / numChannels));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this._buffer.push(pcm16);
    const total = this._buffer.reduce((a, b) => a + b.length, 0);
    if (total >= this._frameSize) {
      const joined = new Int16Array(total);
      let offset = 0;
      for (const chunk of this._buffer) {
        joined.set(chunk, offset);
        offset += chunk.length;
      }
      this.port.postMessage(joined.buffer);
      this._buffer = [];
    }

    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
