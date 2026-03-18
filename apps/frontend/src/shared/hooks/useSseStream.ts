import { useCallback, useEffect, useRef, useState } from "react";

export type SseStatus = "idle" | "connecting" | "connected" | "error" | "closed";

export function useSseStream<T>(url: string | null) {
  const [events, setEvents] = useState<T[]>([]);
  const [status, setStatus] = useState<SseStatus>("idle");
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!url || esRef.current) return;

    setStatus("connecting");
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => setStatus("connected");

    es.onerror = () => {
      setStatus("error");
      es.close();
      esRef.current = null;
    };

    // Listen to all named events
    const handler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as T;
        setEvents((prev) => [...prev, data]);
      } catch {
        // ignore malformed events
      }
    };

    // SSE events are dispatched with their type as event name
    es.addEventListener("text_delta", handler);
    es.addEventListener("text_done", handler);
    es.addEventListener("user_transcript", handler);
    es.addEventListener("agent_transcript_delta", handler);
    es.addEventListener("agent_transcript_done", handler);
    es.addEventListener("tool_invoke_created", handler);
    es.addEventListener("tool_invoke_updated", handler);
    es.addEventListener("tool_status", handler);
    es.addEventListener("error", handler);
  }, [url]);

  const disconnect = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setStatus("closed");
  }, []);

  const clearEvents = useCallback(() => setEvents([]), []);

  useEffect(() => {
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  return { events, status, connect, disconnect, clearEvents };
}
