import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import type { CallStatus } from "@/modules/audio/ui/hooks/useRealtimeCall";
import { StatusBadge } from "@/shared/components/feedback/StatusBadge";
import { Button } from "@/shared/components/ui/button";

interface AudioControlsProps {
  status: CallStatus;
  muted: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleMute: () => void;
}

const statusVariantMap: Record<
  CallStatus,
  "IDLE" | "CONNECTING" | "CONNECTING" | "CONNECTED"
> = {
  idle: "IDLE",
  initializing: "CONNECTING",
  connecting: "CONNECTING",
  connected: "CONNECTED",
};

export function AudioControls({
  status,
  muted,
  onStart,
  onStop,
  onToggleMute,
}: AudioControlsProps) {
  const isActive = status !== "idle";
  const isConnecting = status === "initializing" || status === "connecting";

  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <StatusBadge
        status={statusVariantMap[status]}
        label={
          status === "idle"
            ? "Not connected"
            : status === "initializing"
              ? "Initializing..."
              : status === "connecting"
                ? "Connecting..."
                : "Connected"
        }
      />

      <div className="flex items-center gap-2">
        {isActive && (
          <Button
            size="sm"
            variant={muted ? "destructive" : "outline"}
            onClick={onToggleMute}
            className="gap-1.5"
            disabled={isConnecting}
          >
            {muted ? (
              <>
                <MicOff className="size-3.5" />
                Unmute
              </>
            ) : (
              <>
                <Mic className="size-3.5" />
                Mute
              </>
            )}
          </Button>
        )}

        {!isActive ? (
          <Button size="sm" className="gap-1.5" onClick={onStart}>
            <Phone className="size-3.5" />
            Start session
          </Button>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5"
            onClick={onStop}
            disabled={isConnecting}
          >
            <PhoneOff className="size-3.5" />
            End session
          </Button>
        )}
      </div>
    </div>
  );
}
