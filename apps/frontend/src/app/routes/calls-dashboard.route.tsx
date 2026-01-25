import CallsDashboardPage from "@/modules/calls/ui/pages/CallsDashboardPage";
import { RequireAuth } from "@/shared/components/RequireAuth";

export default function CallsDashboardRoute() {
  return (
    <RequireAuth
      title="Dashboard des appels"
      description="Connecte-toi pour accéder à la liste des appels."
    >
      <CallsDashboardPage />
    </RequireAuth>
  );
}
