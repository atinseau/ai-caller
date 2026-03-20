import { useEffect, useState } from "react";

export interface WebRtcStatsData {
  packetsLost: number;
  jitter: number;
  roundTripTime: number;
}

const POLL_INTERVAL_MS = 2000;

export function useWebRtcStats(
  pc: RTCPeerConnection | null,
): WebRtcStatsData | null {
  const [stats, setStats] = useState<WebRtcStatsData | null>(null);

  useEffect(() => {
    if (!pc) {
      setStats(null);
      return;
    }

    const poll = async () => {
      try {
        const report = await pc.getStats();
        let packetsLost = 0;
        let jitter = 0;
        let roundTripTime = 0;

        report.forEach((entry) => {
          if (entry.type === "inbound-rtp" && entry.kind === "audio") {
            packetsLost = entry.packetsLost ?? 0;
            jitter = entry.jitter ?? 0;
          }
          if (entry.type === "candidate-pair" && entry.state === "succeeded") {
            roundTripTime = entry.currentRoundTripTime ?? 0;
          }
        });

        setStats({ packetsLost, jitter, roundTripTime });
      } catch {
        /* connection may be closing */
      }
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pc]);

  return stats;
}
