export interface AudioStreamService {
  asPromise(): Promise<MediaStream>;
}

export class AudioStream implements AudioStreamService {
  asPromise(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 48000 },
        sampleSize: { ideal: 16 },
      },
    });
  }
}
