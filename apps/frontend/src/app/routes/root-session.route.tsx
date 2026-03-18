import { useParams } from "react-router";
import { AuthGuard } from "@/shared/components/guards/AuthGuard";
import { AppShell } from "@/shared/components/layout/AppShell";
import { UserRoleEnum } from "@/shared/enums/user-role.enum";
import { DebugSessionPage } from "@/modules/debug-session/ui/pages/DebugSessionPage";

export default function RootSessionRoute() {
  const { companyId } = useParams<{ companyId: string }>();

  return (
    <AuthGuard requiredRole={UserRoleEnum.ROOT}>
      <AppShell>
        <DebugSessionPage companyId={companyId!} />
      </AppShell>
    </AuthGuard>
  );
}
