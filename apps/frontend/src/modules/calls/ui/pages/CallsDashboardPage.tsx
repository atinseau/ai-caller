import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useCompanyCalls } from "@/modules/calls/ui/hooks/useCalls";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { useCompanies } from "@/shared/hooks/useCompanies";

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

function CompanyCallsTable({ companyId }: { companyId: string }) {
  const { calls } = useCompanyCalls(companyId);

  if (!calls.length) {
    return (
      <div className="text-sm text-muted-foreground">
        Aucun appel pour cette société.
      </div>
    );
  }

  type CallItem = (typeof calls)[number];
  const totalCostCents = calls.reduce(
    (acc, call) => acc + (call.costCents ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Statut</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Début</TableHead>
            <TableHead>Fin</TableHead>
            <TableHead>Durée</TableHead>
            <TableHead>Coût</TableHead>
            <TableHead>Call ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call: CallItem) => (
            <TableRow key={call.id}>
              <TableCell>
                <Badge variant={statusVariantMap[call.status] ?? "secondary"}>
                  {call.status}
                </Badge>
              </TableCell>
              <TableCell>{call.provider ?? "DEV"}</TableCell>
              <TableCell>{formatDate(call.startedAt)}</TableCell>
              <TableCell>{formatDate(call.endedAt)}</TableCell>
              <TableCell>
                {formatDuration(call.durationSeconds ?? null)}
              </TableCell>
              <TableCell>{formatCost(call.costCents ?? null)}</TableCell>
              <TableCell>
                <Link
                  to={`/calls/${call.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {call.externalCallId ?? call.id}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-end text-sm text-muted-foreground">
        Total estimé:
        <span className="ml-2 font-medium text-foreground">
          {formatCost(totalCostCents)}
        </span>
      </div>
    </div>
  );
}

export default function CallsDashboardPage() {
  const { companies } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  const companyOptions = useMemo(
    () => companies.map((company) => ({ id: company.id, name: company.name })),
    [companies],
  );

  const activeCompanyId =
    selectedCompanyId || (companyOptions[0] ? companyOptions[0].id : "");

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard des appels</CardTitle>
          <CardDescription>
            Suis les appels par société, leur statut et les coûts estimés.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="company-select"
              className="text-sm font-medium text-muted-foreground"
            >
              Société
            </label>
            <div className="flex items-center gap-2">
              <select
                id="company-select"
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={activeCompanyId}
                onChange={(event) => setSelectedCompanyId(event.target.value)}
              >
                {companyOptions.length === 0 ? (
                  <option value="">Aucune société disponible</option>
                ) : (
                  companyOptions.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))
                )}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedCompanyId("")}
                disabled={!companyOptions.length}
              >
                Réinitialiser
              </Button>
            </div>
          </div>

          {activeCompanyId ? (
            <CompanyCallsTable companyId={activeCompanyId} />
          ) : (
            <div className="text-sm text-muted-foreground">
              Crée une société pour voir les appels.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
