import { Navigate } from "react-router";
import { DebugSessionPage } from "@/modules/debug-session/ui/pages/DebugSessionPage";
import { AuthGuard } from "@/shared/components/guards/AuthGuard";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";

function UserSessionInner() {
  const state = useCurrentUser();

  if (state.status !== "authenticated" || !state.user.companyId) {
    return <Navigate to="/dashboard" replace />;
  }

  return <DebugSessionPage companyId={state.user.companyId} />;
}

export default function UserSessionRoute() {
  return (
    <AuthGuard>
      <AppShell>
        <UserSessionInner />
      </AppShell>
    </AuthGuard>
  );
}
