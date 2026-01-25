import CallsDashboardPage from "@/modules/calls/ui/pages/CallsDashboardPage";
import { RequireAuth } from "@/shared/components/RequireAuth";

export default function DashboardRoute() {
  return (
    <RequireAuth
      title="Dashboard"
      description="Connecte-toi pour accéder au dashboard et aux appels."
    >
      <CallsDashboardPage />
    </RequireAuth>
  );
}
