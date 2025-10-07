

export async function getAudioStream() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("getUserMedia is not supported in this browser");
  }
  return navigator.mediaDevices.getUserMedia({ audio: true });
}
