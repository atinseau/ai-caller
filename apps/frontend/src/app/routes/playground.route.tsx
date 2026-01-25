import { RealtimeCallMode } from "@/modules/audio/domain/enums/realtime-call-mode.enum";
import { RealtimeCallPage } from "@/modules/audio/ui/pages/RealtimeCallPage";
import { RequireAuth } from "@/shared/components/RequireAuth";

export default function PlaygroundRoute() {
  return (
    <RequireAuth
      title="Playground"
      description="Connecte-toi pour accéder au playground en mode sandbox."
    >
      <RealtimeCallPage initialMode={RealtimeCallMode.SANDBOX} />
    </RequireAuth>
  );
}
