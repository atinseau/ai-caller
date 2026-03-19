import { Activity, Wrench } from "lucide-react";
import { JsonViewer } from "@/shared/components/data/JsonViewer";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { StatusBadge } from "@/shared/components/feedback/StatusBadge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Separator } from "@/shared/components/ui/separator";
import type { IToolInvoke } from "@/shared/types/session.types";

interface LogsSidebarProps {
  toolInvokes: IToolInvoke[];
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
        <JsonViewer data={tool.args} />
      )}
      {tool.results && Object.keys(tool.results).length > 0 && (
        <JsonViewer data={tool.results} />
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
