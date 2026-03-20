import { Bot, User } from "lucide-react";
import { useEffect, useRef } from "react";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import type { ITranscriptMessage } from "@/shared/types/session.types";
import { cn } from "@/shared/utils";

interface TranscriptFeedProps {
  messages: ITranscriptMessage[];
}

function TranscriptMessage({ message }: { message: ITranscriptMessage }) {
  const isUser = message.type === "user";

  return (
    <div
      className={cn(
        "flex w-full gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>
      <div
        className={cn(
          "max-w-[75%] space-y-1",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm bg-muted text-foreground",
          )}
        >
          {message.text}
        </div>
        <p className="px-1 text-[10px] text-muted-foreground">
          {message.createdAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

export function TranscriptFeed({ messages }: TranscriptFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={Bot}
          title="No messages yet"
          description="Start a session to see the conversation."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      {messages.map((msg) => (
        <TranscriptMessage key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
