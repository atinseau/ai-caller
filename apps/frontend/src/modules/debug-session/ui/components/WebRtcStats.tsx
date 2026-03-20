import { Activity } from "lucide-react";
import { useWebRtcStats } from "../../application/hooks/useWebRtcStats";

interface WebRtcStatsProps {
  peerConnection: RTCPeerConnection | null;
}

export function WebRtcStats({ peerConnection }: WebRtcStatsProps) {
  const stats = useWebRtcStats(peerConnection);

  if (!stats) {
    return (
      <div className="border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">No audio connection</p>
      </div>
    );
  }

  const jitterMs = Math.round(stats.jitter * 1000);
  const rttMs = Math.round(stats.roundTripTime * 1000);
  const lossWarning = stats.packetsLost > 50;
  const jitterWarning = jitterMs > 30;
  const rttWarning = rttMs > 150;

  return (
    <div className="border-t px-4 py-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Activity className="size-3 text-muted-foreground" />
        <span className="text-xs font-medium">Audio Quality</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p
            className={`text-xs font-mono font-medium ${lossWarning ? "text-destructive" : "text-foreground"}`}
          >
            {stats.packetsLost}
          </p>
          <p className="text-[10px] text-muted-foreground">Lost pkts</p>
        </div>
        <div>
          <p
            className={`text-xs font-mono font-medium ${jitterWarning ? "text-amber-500" : "text-foreground"}`}
          >
            {jitterMs}ms
          </p>
          <p className="text-[10px] text-muted-foreground">Jitter</p>
        </div>
        <div>
          <p
            className={`text-xs font-mono font-medium ${rttWarning ? "text-amber-500" : "text-foreground"}`}
          >
            {rttMs}ms
          </p>
          <p className="text-[10px] text-muted-foreground">RTT</p>
        </div>
      </div>
    </div>
  );
}
