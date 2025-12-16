import type { Observable } from "rxjs";

export abstract class AudioStreamPort {
  abstract asPromise(): Promise<MediaStream>;
  abstract asObservable(): Observable<MediaStream>;
}
