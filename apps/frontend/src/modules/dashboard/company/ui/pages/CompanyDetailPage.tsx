import { Building2, ChevronLeft, ExternalLink, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { LoadingSpinner } from "@/shared/components/feedback/LoadingSpinner";
import { StatusBadge } from "@/shared/components/feedback/StatusBadge";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { UserRoleEnum } from "@/shared/enums/user-role.enum";
import { useCompany } from "@/shared/hooks/useCompany";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { useDeleteCompany } from "@/shared/hooks/useDeleteCompany";

export function CompanyDetailPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const state = useCurrentUser();
  const { data: company, isLoading } = useCompany(companyId ?? null);
  const { mutateAsync: deleteCompany, isPending: isDeleting } =
    useDeleteCompany();

  const isRoot =
    state.status === "authenticated" && state.user.role === UserRoleEnum.ROOT;

  async function handleDelete() {
    if (!company) return;
    // biome-ignore lint/suspicious/noAlert: confirmation dialog is intentional UX
    if (!confirm(`Delete "${company.name}"? This action cannot be undone.`))
      return;
    try {
      await deleteCompany(company.id);
      toast.success(`Company "${company.name}" deleted`);
      navigate("/dashboard/root");
    } catch {
      toast.error("Failed to delete company");
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingSpinner className="py-12" label="Loading company..." />
      </PageContainer>
    );
  }

  if (!company) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground">Company not found.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={company.name}
        description="Company details and configuration."
        actions={
          isRoot ? (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="size-4" />
              {isDeleting ? "Deleting..." : "Delete company"}
            </Button>
          ) : undefined
        }
      />

      {isRoot && (
        <Button
          variant="ghost"
          size="sm"
          className="-mt-2 gap-1.5 text-muted-foreground"
          onClick={() => navigate("/dashboard/root")}
        >
          <ChevronLeft className="size-4" />
          Back to companies
        </Button>
      )}

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 text-muted-foreground" />
            {company.name}
          </CardTitle>
          <CardDescription>
            <StatusBadge status={company.status} />
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <ExternalLink className="size-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground truncate">
              {company.mcpUrl}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Created {new Date(company.createdAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
