

export async function getAudioStream() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("getUserMedia is not supported in this browser");
  }
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: { ideal: 1 },
      sampleRate: { ideal: 48000 },
      sampleSize: { ideal: 16 },
    }
  });
}
