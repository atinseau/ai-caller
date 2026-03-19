import { useEffect } from "react";
import { useNavigate } from "react-router";
import { LoadingSpinner } from "@/shared/components/feedback/LoadingSpinner";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";

export function UserDashboardPage() {
  const state = useCurrentUser();
  const navigate = useNavigate();

  const companyId =
    state.status === "authenticated" ? state.user.companyId : null;

  useEffect(() => {
    if (companyId) {
      navigate(`/dashboard/company/${companyId}`, { replace: true });
    }
  }, [companyId, navigate]);

  return (
    <PageContainer>
      <LoadingSpinner className="py-12" label="Loading your company..." />
    </PageContainer>
  );
}
