export class ApiWebSocket {
  private socket: WebSocket | null = null;
  // Map of event name to Set of callbacks
  private eventListeners: Map<string, Set<(data: Event) => void>> = new Map();
  // Map for once listeners to allow removal after first call
  private onceListeners: Map<string, Set<(data: Event) => void>> = new Map();

  constructor(private readonly path: string = "/ws") {
    this.socket = new WebSocket(import.meta.env.VITE_API_URL + this.path);

    // Attach generic event dispatcher
    this.socket.addEventListener("open", (event) => this.dispatch("open", event));
    this.socket.addEventListener("close", (event) => this.dispatch("close", event));
    this.socket.addEventListener("error", (event) => this.dispatch("error", event));
    this.socket.addEventListener("message", (event) => this.dispatch("message", event));
  }

  private dispatch(eventName: string, event: Event) {
    // Regular listeners
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(cb => cb(event));
    }
    // Once listeners
    const onceSet = this.onceListeners.get(eventName);
    if (onceSet) {
      onceSet.forEach(cb => cb(event));
      this.onceListeners.delete(eventName);
    }
  }

  close() {
    if (!this.isOpen || !this.socket) {
      console.warn("WebSocket is not open or already closed.");
      return;
    }
    this.socket.close()
  }

  on(event: string, callback: (data: Event) => void) {
    if (!this.socket) {
      console.warn("WebSocket is not initialized. Unable to attach event listener.");
      return;
    }
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  once(event: string, callback: (data: Event) => void) {
    if (!this.socket) {
      console.warn("WebSocket is not initialized. Unable to attach event listener.");
      return;
    }
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event)!.add(callback);
  }

  off(event: string, callback?: (data: Event) => void) {
    if (!this.socket) {
      console.warn("WebSocket is not initialized. Unable to detach event listener.");
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
    if (!this.isOpen || !this.socket) {
      console.warn("WebSocket is not open. Unable to send message.");
      return;
    }
    this.socket.send(data)
  }

  private get isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }
}
