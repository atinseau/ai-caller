import { injectable } from "inversify";
import { Subject } from "rxjs";
import type {
  TextStreamEvent,
  TextStreamPort,
} from "@/domain/ports/text-stream.port";

@injectable()
export class InMemoryTextStream implements TextStreamPort {
  private readonly streams: Map<string, Subject<TextStreamEvent>> = new Map();

  subscribe(roomId: string): AsyncIterable<TextStreamEvent> {
    const subject = this.getOrCreateSubject(roomId);
    return this.toAsyncIterable(subject);
  }

  publish(roomId: string, event: TextStreamEvent): void {
    const subject = this.streams.get(roomId);
    if (subject && !subject.closed) {
      subject.next(event);
    }
  }

  close(roomId: string): void {
    const subject = this.streams.get(roomId);
    if (subject) {
      subject.complete();
      this.streams.delete(roomId);
    }
  }

  private getOrCreateSubject(roomId: string): Subject<TextStreamEvent> {
    let subject = this.streams.get(roomId);
    if (!subject || subject.closed) {
      subject = new Subject<TextStreamEvent>();
      this.streams.set(roomId, subject);
    }
    return subject;
  }

  private toAsyncIterable(
    subject: Subject<TextStreamEvent>,
  ): AsyncIterable<TextStreamEvent> {
    return {
      [Symbol.asyncIterator]() {
        const buffer: TextStreamEvent[] = [];
        let resolve: ((value: IteratorResult<TextStreamEvent>) => void) | null =
          null;
        let done = false;

        const subscription = subject.subscribe({
          next(value) {
            if (resolve) {
              resolve({ value, done: false });
              resolve = null;
            } else {
              buffer.push(value);
            }
          },
          complete() {
            done = true;
            if (resolve) {
              resolve({ value: undefined as never, done: true });
              resolve = null;
            }
          },
        });

        return {
          next() {
            if (buffer.length > 0) {
              return Promise.resolve({
                value: buffer.shift()!,
                done: false,
              });
            }
            if (done) {
              return Promise.resolve({
                value: undefined as never,
                done: true,
              });
            }
            return new Promise<IteratorResult<TextStreamEvent>>((r) => {
              resolve = r;
            });
          },
          return() {
            subscription.unsubscribe();
            return Promise.resolve({
              value: undefined as never,
              done: true,
            });
          },
        };
      },
    };
  }
}
