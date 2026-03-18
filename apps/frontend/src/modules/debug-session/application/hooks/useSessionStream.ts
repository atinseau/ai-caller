import { useCallback, useEffect, useRef, useState } from "react";
import { SessionEventTypeEnum } from "@/shared/enums/session-event-type.enum";
import type {
  IRoomEvent,
  IToolInvoke,
  ITranscriptMessage,
  SessionStreamEvent,
} from "@/shared/types/session.types";

interface UseSessionStreamOptions {
  roomId: string | null;
}

function buildTranscriptFromEvent(event: IRoomEvent): ITranscriptMessage | null {
  if (event.type === "USER_TRANSCRIPT") {
    return {
      id: event.id,
      type: "user",
      text: (event.payload.text as string) ?? "",
      createdAt: new Date(event.createdAt),
    };
  }
  if (event.type === "AGENT_TRANSCRIPT") {
    return {
      id: event.id,
      type: "agent",
      text: (event.payload.text as string) ?? "",
      createdAt: new Date(event.createdAt),
    };
  }
  if (event.type === "TEXT_DONE") {
    return {
      id: event.id,
      type: "agent",
      text: (event.payload.text as string) ?? "",
      createdAt: new Date(event.createdAt),
    };
  }
  return null;
}

export function useSessionStream({ roomId }: UseSessionStreamOptions) {
  const [transcripts, setTranscripts] = useState<ITranscriptMessage[]>([]);
  const [toolInvokes, setToolInvokes] = useState<IToolInvoke[]>([]);
  const [sseStatus, setSseStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const esRef = useRef<EventSource | null>(null);
  const agentDeltaBuffer = useRef<Map<string, string>>(new Map());

  // Load historical events on mount
  useEffect(() => {
    if (!roomId) return;

    fetch(`${import.meta.env.VITE_API_URL}/api/v1/room/${roomId}/events`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data: { events: IRoomEvent[] }) => {
        const msgs: ITranscriptMessage[] = [];
        const tools: IToolInvoke[] = [];

        for (const event of data.events) {
          const transcript = buildTranscriptFromEvent(event);
          if (transcript) msgs.push(transcript);

          if (event.type === "TOOL_INVOKE_CREATED") {
            tools.push(event.payload.toolInvoke as IToolInvoke);
          }
          if (event.type === "TOOL_INVOKE_UPDATED") {
            const updated = event.payload.toolInvoke as IToolInvoke;
            const idx = tools.findIndex((t) => t.id === updated.id);
            if (idx >= 0) tools[idx] = updated;
            else tools.push(updated);
          }
        }

        setTranscripts(msgs);
        setToolInvokes(tools);
      })
      .catch(() => {});
  }, [roomId]);

  const handleEvent = useCallback((event: SessionStreamEvent) => {
    switch (event.type) {
      case SessionEventTypeEnum.USER_TRANSCRIPT:
        setTranscripts((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: "user",
            text: event.text,
            createdAt: new Date(),
          },
        ]);
        break;

      case SessionEventTypeEnum.AGENT_TRANSCRIPT_DELTA:
        // Buffer deltas keyed by a running key
        agentDeltaBuffer.current.set(
          "current",
          (agentDeltaBuffer.current.get("current") ?? "") + event.text,
        );
        break;

      case SessionEventTypeEnum.AGENT_TRANSCRIPT_DONE:
        agentDeltaBuffer.current.delete("current");
        setTranscripts((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: "agent",
            text: event.text,
            createdAt: new Date(),
          },
        ]);
        break;

      case SessionEventTypeEnum.TEXT_DONE:
        // TEXT mode: agent text response
        setTranscripts((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: "agent",
            text: event.text,
            createdAt: new Date(),
          },
        ]);
        break;

      case SessionEventTypeEnum.TOOL_INVOKE_CREATED:
        setToolInvokes((prev) => [...prev, event.toolInvoke]);
        break;

      case SessionEventTypeEnum.TOOL_INVOKE_UPDATED:
        setToolInvokes((prev) =>
          prev.map((t) =>
            t.id === event.toolInvoke.id ? event.toolInvoke : t,
          ),
        );
        break;
    }
  }, []);

  const connect = useCallback(
    (roomId: string) => {
      if (esRef.current) return;

      setSseStatus("connecting");
      const url = `${import.meta.env.VITE_API_URL}/api/v1/room/${roomId}/stream`;
      const es = new EventSource(url, { withCredentials: true });
      esRef.current = es;

      es.onopen = () => setSseStatus("connected");
      es.onerror = () => {
        setSseStatus("error");
        es.close();
        esRef.current = null;
      };

      const listener = (e: MessageEvent) => {
        try {
          handleEvent(JSON.parse(e.data) as SessionStreamEvent);
        } catch {
          // ignore
        }
      };

      for (const type of Object.values(SessionEventTypeEnum)) {
        es.addEventListener(type, listener);
      }
    },
    [handleEvent],
  );

  const disconnect = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setSseStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  return { transcripts, toolInvokes, sseStatus, connect, disconnect };
}
