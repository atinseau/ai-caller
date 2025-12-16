import { from, Observable } from "rxjs"
import type { AudioStreamPort } from "@/domain/audio-stream.port";
import { injectable } from "inversify";

@injectable()
export class AudioStream implements AudioStreamPort {

  public asObservable(): Observable<MediaStream> {
    return from(this.getStream())
  }

  public asPromise(): Promise<MediaStream> {
    return this.getStream()
  }

  private getStream(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 48000 },
        sampleSize: { ideal: 16 },
      }
    })
  }
}
