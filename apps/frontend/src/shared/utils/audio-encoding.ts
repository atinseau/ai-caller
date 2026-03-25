/** Max chunk size for String.fromCharCode spread to avoid stack overflow */
const CHUNK_SIZE = 0x8000;

/**
 * Convert an Int16 PCM ArrayBuffer to a base64 string.
 * Uses chunked String.fromCharCode spread instead of per-byte concatenation (O(n) vs O(n²)).
 */
export function int16BufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE)));
  }
  return btoa(chunks.join(""));
}

/**
 * Decode a base64-encoded Int16 PCM string into a Float32Array suitable for Web Audio.
 * Uses DataView.getInt16() in a single pass instead of creating intermediate typed arrays.
 */
export function base64ToFloat32(base64: string): Float32Array<ArrayBuffer> {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const sampleCount = Math.floor(len / 2);
  const out = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    out[i] = view.getInt16(i * 2, true) / 32768;
  }
  return out;
}
