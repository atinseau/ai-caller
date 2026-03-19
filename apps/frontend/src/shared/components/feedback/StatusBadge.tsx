import { Loader2 } from "lucide-react";
import { cn } from "@/shared/utils";

type StatusVariant =
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CONNECTED"
  | "CONNECTING"
  | "IDLE"
  | "ERROR"
  | "TEST"
  | "ACTIVE"
  | "INACTIVE";

const variantStyles: Record<StatusVariant, string> = {
  RUNNING: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  COMPLETED: "bg-green-500/15 text-green-600 border-green-500/30",
  FAILED: "bg-red-500/15 text-red-600 border-red-500/30",
  CONNECTED: "bg-green-500/15 text-green-600 border-green-500/30",
  CONNECTING: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  IDLE: "bg-muted text-muted-foreground border-border",
  ERROR: "bg-red-500/15 text-red-600 border-red-500/30",
  TEST: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  ACTIVE: "bg-green-500/15 text-green-600 border-green-500/30",
  INACTIVE: "bg-muted text-muted-foreground border-border",
};

const variantLabels: Record<StatusVariant, string> = {
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CONNECTED: "Connected",
  CONNECTING: "Connecting",
  IDLE: "Idle",
  ERROR: "Error",
  TEST: "Test",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const isAnimated = status === "RUNNING" || status === "CONNECTING";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        variantStyles[status],
        className,
      )}
    >
      {isAnimated ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <span className="size-1.5 rounded-full bg-current" />
      )}
      {label ?? variantLabels[status]}
    </span>
  );
}
