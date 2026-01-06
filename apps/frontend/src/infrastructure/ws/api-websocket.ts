import { ApiWebSocketEventEnum } from "@/shared/enums/api-web-socket-event.enum";

type ApiWebSocketEventType = {
  [ApiWebSocketEventEnum.CLOSE]: CloseEvent;
  [ApiWebSocketEventEnum.OPEN]: Event;
  [ApiWebSocketEventEnum.ERROR]: Event;
  [ApiWebSocketEventEnum.MESSAGE]: MessageEvent;
};

type ApiWebSocketEventCallback<T extends ApiWebSocketEventEnum> = (
  data: ApiWebSocketEventType[T],
) => void;

export class ApiWebSocket {
  private socket: WebSocket | null = null;
  // Map of event name to Set of callbacks
  private eventListeners: Map<
    string,
    Set<ApiWebSocketEventCallback<ApiWebSocketEventEnum>>
  > = new Map();
  // Map for once listeners to allow removal after first call
  private onceListeners: Map<
    string,
    Set<ApiWebSocketEventCallback<ApiWebSocketEventEnum>>
  > = new Map();

  constructor(private readonly path: string = "/ws") {
    this.socket = new WebSocket(import.meta.env.VITE_API_URL + this.path);
    this.socket.binaryType = "arraybuffer";

    // Attach generic event dispatcher
    this.socket.addEventListener("open", (event) =>
      this.dispatch(ApiWebSocketEventEnum.OPEN, event),
    );
    this.socket.addEventListener("close", (event) =>
      this.dispatch(ApiWebSocketEventEnum.CLOSE, event),
    );
    this.socket.addEventListener("error", (event) =>
      this.dispatch(ApiWebSocketEventEnum.ERROR, event),
    );
    this.socket.addEventListener("message", (event) =>
      this.dispatch(ApiWebSocketEventEnum.MESSAGE, event),
    );
  }

  private dispatch<T extends ApiWebSocketEventEnum>(
    eventName: ApiWebSocketEventEnum,
    event: ApiWebSocketEventType[T],
  ) {
    // Regular listeners
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach((cb) => cb(event));
    }
    // Once listeners
    const onceSet = this.onceListeners.get(eventName);
    if (onceSet) {
      onceSet.forEach((cb) => cb(event));
      this.onceListeners.delete(eventName);
    }
  }

  close() {
    if (!this.isOpen() || !this.socket) {
      console.warn("WebSocket is not open or already closed.");
      return;
    }
    this.socket.close();
  }

  on<T extends ApiWebSocketEventEnum>(
    event: T,
    callback: ApiWebSocketEventCallback<T>,
  ) {
    if (!this.socket) {
      console.warn(
        "WebSocket is not initialized. Unable to attach event listener.",
      );
      return;
    }
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners
      .get(event)!
      .add(callback as ApiWebSocketEventCallback<ApiWebSocketEventEnum>);
  }

  once(event: string, callback: (data: Event) => void) {
    if (!this.socket) {
      console.warn(
        "WebSocket is not initialized. Unable to attach event listener.",
      );
      return;
    }
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event)!.add(callback);
  }

  off(event: string, callback?: (data: Event) => void) {
    if (!this.socket) {
      console.warn(
        "WebSocket is not initialized. Unable to detach event listener.",
      );
      return;
    }
    if (callback) {
      // Remove from regular listeners
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
      // Remove from once listeners
      const onceSet = this.onceListeners.get(event);
      if (onceSet) {
        onceSet.delete(callback);
        if (onceSet.size === 0) {
          this.onceListeners.delete(event);
        }
      }
    } else {
      // Remove all listeners for this event
      this.eventListeners.delete(event);
      this.onceListeners.delete(event);
    }
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (!this.isOpen() || !this.socket) {
      console.warn("WebSocket is not open. Unable to send message.");
      return;
    }
    this.socket.send(data);
  }

  isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
