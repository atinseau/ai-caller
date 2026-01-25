import { RealtimeCallMode } from "@/modules/audio/domain/enums/realtime-call-mode.enum";
import { RealtimeCallPage } from "@/modules/audio/ui/pages/RealtimeCallPage";

export default function RealtimeCallRoute() {
  return <RealtimeCallPage initialMode={RealtimeCallMode.DEVELOPMENT} />;
}
