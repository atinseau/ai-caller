import { Building2, ExternalLink, Play } from "lucide-react";
import { useNavigate } from "react-router";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { LoadingSpinner } from "@/shared/components/feedback/LoadingSpinner";
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

export function RootDashboardPage() {
  const { companies, isLoading } = useCompanies();
  const navigate = useNavigate();

  return (
    <PageContainer>
      <PageHeader
        title="Companies"
        description="Manage onboarded companies and start debug sessions."
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
                <TableHead>MCP URL</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ExternalLink className="size-3" />
                      <span className="max-w-[200px] truncate">
                        {company.mcpUrl}
                      </span>
                    </span>
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
                        navigate(`/dashboard/root/session/${company.id}`)
                      }
                    >
                      <Play className="size-3" />
                      Debug
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageContainer>
  );
}
