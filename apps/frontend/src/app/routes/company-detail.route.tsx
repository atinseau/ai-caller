import { CompanyDetailPage } from "@/modules/dashboard/company/ui/pages/CompanyDetailPage";
import { AuthGuard } from "@/shared/components/guards/AuthGuard";
import { AppShell } from "@/shared/components/layout/AppShell";

export default function CompanyDetailRoute() {
  return (
    <AuthGuard>
      <AppShell>
        <CompanyDetailPage />
      </AppShell>
    </AuthGuard>
  );
}
