export function stopAudioStream(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}
