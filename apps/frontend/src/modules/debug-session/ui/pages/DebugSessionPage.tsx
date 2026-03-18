import { useEffect, useRef } from "react";
import { ArrowLeft, Building2, FlaskConical } from "lucide-react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/infrastructure/http/api";
import { useRealtimeCall } from "@/modules/audio/ui/hooks/useRealtimeCall";
import { StatusBadge } from "@/shared/components/feedback/StatusBadge";
import { LoadingSpinner } from "@/shared/components/feedback/LoadingSpinner";
import { Button } from "@/shared/components/ui/button";
import { useSessionStream } from "../../application/hooks/useSessionStream";
import { AudioControls } from "../components/AudioControls";
import { LogsSidebar } from "../components/LogsSidebar";
import { TranscriptFeed } from "../components/TranscriptFeed";

interface DebugSessionPageProps {
  companyId: string;
}

export function DebugSessionPage({ companyId }: DebugSessionPageProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { state: callState, start, stop, toggleMute } = useRealtimeCall(audioRef);
  const { transcripts, toolInvokes, sseStatus, connect, disconnect } =
    useSessionStream({ roomId: callState.roomId });

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const res = await api.GET("/api/v1/company/all");
      const companies = res.data?.companies ?? [];
      return companies.find((c) => c.id === companyId) ?? null;
    },
    enabled: !!companyId,
  });

  // Connect SSE when room is ready
  useEffect(() => {
    if (callState.roomId) {
      connect(callState.roomId);
    }
    return () => {
      disconnect();
    };
  }, [callState.roomId, connect, disconnect]);

  if (companyLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" label="Loading company..." />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="sm" asChild className="-ml-1 gap-1.5">
          <Link to="/dashboard/root">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
        <div className="h-4 w-px bg-border" />
        <Building2 className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {company?.name ?? companyId}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <StatusBadge status="TEST" label="Test mode" />
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FlaskConical className="size-3" />
            External integrations are mocked
          </span>
          {sseStatus === "connected" && (
            <StatusBadge status="CONNECTED" label="Live" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Left: Conversation (72%) */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <TranscriptFeed messages={transcripts} />
            </div>
            <AudioControls
              status={callState.status}
              muted={callState.muted}
              onStart={() => start(companyId)}
              onStop={stop}
              onToggleMute={toggleMute}
            />
          </div>

          {/* Divider */}
          <div className="w-px bg-border" />

          {/* Right: Logs (28%) */}
          <div className="w-72 shrink-0 overflow-hidden">
            <LogsSidebar toolInvokes={toolInvokes} />
          </div>
        </div>
      </div>

      {/* Hidden audio element for WebRTC playback */}
      <audio ref={audioRef} autoPlay className="hidden" />
    </div>
  );
}
