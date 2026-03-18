import { AuthGuard } from "@/shared/components/guards/AuthGuard";
import { AppShell } from "@/shared/components/layout/AppShell";
import { UserDashboardPage } from "@/modules/dashboard/user/ui/pages/UserDashboardPage";

export default function UserDashboardRoute() {
  return (
    <AuthGuard>
      <AppShell>
        <UserDashboardPage />
      </AppShell>
    </AuthGuard>
  );
}
