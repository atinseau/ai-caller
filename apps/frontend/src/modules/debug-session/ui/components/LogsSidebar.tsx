import { Activity, ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { StatusBadge } from "@/shared/components/feedback/StatusBadge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Separator } from "@/shared/components/ui/separator";
import type { IToolInvoke } from "@/shared/types/session.types";

interface LogsSidebarProps {
  toolInvokes: IToolInvoke[];
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${formatValue(v)}`)
      .join(", ");
  }
  return String(value);
}

function KeyValueList({
  data,
  label,
}: {
  data: Record<string, unknown>;
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined,
  );

  if (entries.length === 0) return null;

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        <span>{label}</span>
      </button>
      {expanded && (
        <dl className="mt-1.5 space-y-1 pl-4">
          {entries.map(([key, value]) => (
            <div key={key} className="flex gap-1.5">
              <dt className="shrink-0 text-muted-foreground">{key}:</dt>
              <dd className="break-all text-foreground">
                {formatValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function ToolInvokeItem({ tool }: { tool: IToolInvoke }) {
  return (
    <div className="space-y-1.5 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-xs font-medium">
          {tool.toolName ?? "unknown"}
        </span>
        <StatusBadge status={tool.status} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        {new Date(tool.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </p>
      {tool.args && Object.keys(tool.args).length > 0 && (
        <KeyValueList data={tool.args} label="Parameters" />
      )}
      {tool.results && Object.keys(tool.results).length > 0 && (
        <KeyValueList data={tool.results} label="Result" />
      )}
    </div>
  );
}

export function LogsSidebar({ toolInvokes }: LogsSidebarProps) {
  const runningTools = toolInvokes.filter((t) => t.status === "RUNNING");
  const doneTools = toolInvokes.filter((t) => t.status !== "RUNNING");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Activity className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Logs</span>
        {toolInvokes.length > 0 && (
          <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
            {toolInvokes.length}
          </span>
        )}
      </div>

      {toolInvokes.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No tools invoked yet"
          description="Tool calls will appear here during the session."
          className="flex-1"
        />
      ) : (
        <ScrollArea className="flex-1 px-3 py-3">
          <div className="space-y-2">
            {runningTools.length > 0 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Running
                </p>
                {runningTools.map((t) => (
                  <ToolInvokeItem key={t.id} tool={t} />
                ))}
              </>
            )}
            {runningTools.length > 0 && doneTools.length > 0 && <Separator />}
            {doneTools.length > 0 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Completed
                </p>
                {doneTools.map((t) => (
                  <ToolInvokeItem key={t.id} tool={t} />
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
