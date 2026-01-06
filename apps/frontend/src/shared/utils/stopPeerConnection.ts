export function stopPeerConnection(pc: RTCPeerConnection) {
  pc.getSenders().forEach((sender) => {
    if (sender.track) {
      sender.track.stop();
    }
  });
  pc.close();
}
