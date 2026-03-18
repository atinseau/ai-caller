import type { RefObject } from "react";
import type { RealtimeRoomService } from "./services/realtime-openai-room.service";

type ConnectWebRtcParams = {
  companyId: string;
  audioStream: MediaStream;
  audioRef: RefObject<HTMLAudioElement | null>;
  realtimeRoom: RealtimeRoomService;
};

export async function connectWebRtc({
  companyId,
  audioStream,
  audioRef,
  realtimeRoom,
}: ConnectWebRtcParams): Promise<{
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  roomId: string;
}> {
  const { pc, dc, roomId, roomToken } =
    await realtimeRoom.createRoom(companyId);

  pc.addTrack(audioStream.getTracks()[0]);
  pc.ontrack = (e) => {
    if (audioRef.current) audioRef.current.srcObject = e.streams[0];
  };

  await realtimeRoom.attachCallToRoom(pc, roomId, roomToken);

  return { pc, dc, roomId };
}
