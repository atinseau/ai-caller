import { Building2, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { LoadingSpinner } from "@/shared/components/feedback/LoadingSpinner";
import { StatusBadge } from "@/shared/components/feedback/StatusBadge";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { useCompanies } from "@/shared/hooks/useCompanies";
import { CreateCompanyDialog } from "../components/CreateCompanyDialog";

export function RootDashboardPage() {
  const { companies, isLoading } = useCompanies();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <PageContainer>
      <PageHeader
        title="Companies"
        description="Manage onboarded companies and start debug sessions."
        actions={
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Add company
          </Button>
        }
      />

      {isLoading ? (
        <LoadingSpinner className="py-12" label="Loading companies..." />
      ) : companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description="Onboard a company to get started."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>MCP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={company.mcpUrl ? "CONNECTED" : "IDLE"}
                      label={company.mcpUrl ? "Configured" : "Not configured"}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={company.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() =>
                        navigate(`/dashboard/company/${company.id}`)
                      }
                    >
                      <Settings className="size-3" />
                      Configure
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateCompanyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageContainer>
  );
}
