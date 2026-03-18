import { Building2, ExternalLink, Play } from "lucide-react";
import { useNavigate } from "react-router";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { LoadingSpinner } from "@/shared/components/feedback/LoadingSpinner";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { api } from "@/infrastructure/http/api";
import { useQuery } from "@tanstack/react-query";

export function UserDashboardPage() {
  const state = useCurrentUser();
  const navigate = useNavigate();

  const companyId =
    state.status === "authenticated" ? state.user.companyId : null;

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const res = await api.GET("/api/v1/company/all");
      const companies = res.data?.companies ?? [];
      return companies.find((c) => c.id === companyId) ?? null;
    },
    enabled: !!companyId,
  });

  const userName =
    state.status === "authenticated" ? state.user.name : undefined;

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome${userName ? `, ${userName.split(" ")[0]}` : ""}`}
        description="Start a test session to debug your AI agent."
      />

      {isLoading ? (
        <LoadingSpinner className="py-12" label="Loading your company..." />
      ) : !company ? (
        <EmptyState
          icon={Building2}
          title="No company assigned"
          description="Contact your administrator to assign you to a company."
        />
      ) : (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              {company.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <ExternalLink className="size-3" />
              <span className="truncate">{company.mcpUrl}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full gap-2"
              onClick={() => navigate("/dashboard/session")}
            >
              <Play className="size-4" />
              Start test session
            </Button>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
