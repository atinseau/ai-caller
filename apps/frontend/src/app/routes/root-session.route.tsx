import { useParams } from "react-router";
import { DebugSessionPage } from "@/modules/debug-session/ui/pages/DebugSessionPage.tsx";
import { AuthGuard } from "@/shared/components/guards/AuthGuard.tsx";
import { AppShell } from "@/shared/components/layout/AppShell.tsx";
import { UserRoleEnum } from "@/shared/enums/user-role.enum.ts";

export default function RootSessionRoute() {
  const { companyId } = useParams<{ companyId: string }>();

  return (
    <AuthGuard requiredRole={UserRoleEnum.ROOT}>
      <AppShell>
        <DebugSessionPage companyId={companyId ?? ""} />
      </AppShell>
    </AuthGuard>
  );
}
