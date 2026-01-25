import CallDetailPage from "@/modules/calls/ui/pages/CallDetailPage";
import { RequireAuth } from "@/shared/components/RequireAuth";

export default function CallDetailRoute() {
  return (
    <RequireAuth
      title="Détail de l’appel"
      description="Connecte-toi pour accéder aux détails de l’appel."
    >
      <CallDetailPage />
    </RequireAuth>
  );
}
