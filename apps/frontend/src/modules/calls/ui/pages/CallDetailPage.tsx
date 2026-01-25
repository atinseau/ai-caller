import { useMemo } from "react";
import { useParams } from "react-router";
import { useCall } from "@/modules/calls/ui/hooks/useCalls";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CREATED: "secondary",
  CONNECTED: "default",
  ENDED: "outline",
  FAILED: "destructive",
};

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDuration(seconds?: number | null) {
  if (!seconds && seconds !== 0) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatCost(costCents?: number | null) {
  if (!costCents && costCents !== 0) return "-";
  return `${(costCents / 100).toFixed(2)} €`;
}

export default function CallDetailPage() {
  const { callId } = useParams();
  const { call, isLoading, isError } = useCall(callId);

  const transcript = useMemo(() => {
    if (!call?.transcript) return null;
    return JSON.stringify(call.transcript, null, 2);
  }, [call?.transcript]);

  const metadata = useMemo(() => {
    if (!call?.metadata) return null;
    return JSON.stringify(call.metadata, null, 2);
  }, [call?.metadata]);

  if (!callId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Aucun identifiant d’appel fourni.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Chargement des détails de l’appel…
      </div>
    );
  }

  if (isError || !call) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Impossible de charger cet appel.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Détail de l’appel</CardTitle>
          <CardDescription>
            Informations principales et traces de conversation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Statut</span>
              <Badge variant={statusVariantMap[call.status] ?? "secondary"}>
                {call.status}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Provider</span>{" "}
              {call.provider ?? "DEV"}
            </div>
            <div>
              <span className="text-muted-foreground">Début</span>{" "}
              {formatDate(call.startedAt)}
            </div>
            <div>
              <span className="text-muted-foreground">Fin</span>{" "}
              {formatDate(call.endedAt)}
            </div>
            <div>
              <span className="text-muted-foreground">Durée</span>{" "}
              {formatDuration(call.durationSeconds ?? null)}
            </div>
            <div>
              <span className="text-muted-foreground">Coût</span>{" "}
              {formatCost(call.costCents ?? null)}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border p-4 text-sm">
              <div className="text-muted-foreground">Call ID</div>
              <div className="font-mono">{call.id}</div>
            </div>
            <div className="rounded-md border p-4 text-sm">
              <div className="text-muted-foreground">External Call ID</div>
              <div className="font-mono">{call.externalCallId ?? "-"}</div>
            </div>
            <div className="rounded-md border p-4 text-sm">
              <div className="text-muted-foreground">Company ID</div>
              <div className="font-mono">{call.companyId}</div>
            </div>
            <div className="rounded-md border p-4 text-sm">
              <div className="text-muted-foreground">Room ID</div>
              <div className="font-mono">{call.roomId ?? "-"}</div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Transcript</div>
            {transcript ? (
              <pre className="rounded-md border bg-muted/30 p-4 text-xs">
                {transcript}
              </pre>
            ) : (
              <div className="text-sm text-muted-foreground">
                Aucun transcript enregistré.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Metadata</div>
            {metadata ? (
              <pre className="rounded-md border bg-muted/30 p-4 text-xs">
                {metadata}
              </pre>
            ) : (
              <div className="text-sm text-muted-foreground">
                Aucune metadata enregistrée.
              </div>
            )}
          </div>

          <div>
            <Button variant="outline" onClick={() => window.history.back()}>
              Retour
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
