import { AuthGuard } from "@/shared/components/guards/AuthGuard";
import { AppShell } from "@/shared/components/layout/AppShell";
import { UserRoleEnum } from "@/shared/enums/user-role.enum";
import { RootDashboardPage } from "@/modules/dashboard/root/ui/pages/RootDashboardPage";

export default function RootDashboardRoute() {
  return (
    <AuthGuard requiredRole={UserRoleEnum.ROOT}>
      <AppShell>
        <RootDashboardPage />
      </AppShell>
    </AuthGuard>
  );
}
