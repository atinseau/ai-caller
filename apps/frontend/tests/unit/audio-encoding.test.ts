import { describe, expect, it } from "vitest";
import {
  base64ToFloat32,
  int16BufferToBase64,
} from "@/shared/utils/audio-encoding";

describe("audio-encoding", () => {
  describe("int16BufferToBase64 → base64ToFloat32 round-trip", () => {
    it("should round-trip a known pattern with minimal quantization loss", () => {
      // Create a known Int16 pattern
      const int16 = new Int16Array([0, 100, -100, 32767, -32768, 1000, -1000]);
      const base64 = int16BufferToBase64(int16.buffer);
      const float32 = base64ToFloat32(base64);

      // Each sample should match: int16[i] / 32768
      expect(float32.length).toBe(int16.length);
      for (let i = 0; i < int16.length; i++) {
        const expected = int16[i] / 32768;
        expect(Math.abs(float32[i] - expected)).toBeLessThan(0.0001);
      }
    });

    it("should handle boundary values correctly", () => {
      const int16 = new Int16Array([32767, -32768, 0]);
      const base64 = int16BufferToBase64(int16.buffer);
      const float32 = base64ToFloat32(base64);

      // Max positive: 32767/32768 ≈ 0.99997
      expect(float32[0]).toBeCloseTo(32767 / 32768, 4);
      // Max negative: -32768/32768 = -1.0
      expect(float32[1]).toBeCloseTo(-1.0, 4);
      // Zero
      expect(float32[2]).toBe(0);
    });

    it("should handle empty buffer", () => {
      const int16 = new Int16Array(0);
      const base64 = int16BufferToBase64(int16.buffer);
      const float32 = base64ToFloat32(base64);

      expect(float32.length).toBe(0);
    });

    it("should handle large buffers without stack overflow", () => {
      // 64KB of int16 data (32K samples) — exceeds CHUNK_SIZE boundary
      const size = 32768;
      const int16 = new Int16Array(size);
      for (let i = 0; i < size; i++) {
        int16[i] = Math.floor(Math.random() * 65536) - 32768;
      }

      const base64 = int16BufferToBase64(int16.buffer);
      const float32 = base64ToFloat32(base64);

      expect(float32.length).toBe(size);
      // Spot-check a few values
      for (let i = 0; i < 10; i++) {
        const idx = Math.floor(Math.random() * size);
        expect(Math.abs(float32[idx] - int16[idx] / 32768)).toBeLessThan(
          0.0001,
        );
      }
    });
  });

  describe("int16BufferToBase64", () => {
    it("should produce valid base64 string", () => {
      const int16 = new Int16Array([1, 2, 3]);
      const base64 = int16BufferToBase64(int16.buffer);

      // Should be decodable without error
      expect(() => atob(base64)).not.toThrow();
    });
  });

  describe("base64ToFloat32", () => {
    it("should produce correct Float32Array length from base64", () => {
      // 4 Int16 samples = 8 bytes = some base64 string
      const int16 = new Int16Array([10, 20, 30, 40]);
      const base64 = int16BufferToBase64(int16.buffer);
      const float32 = base64ToFloat32(base64);

      expect(float32.length).toBe(4);
    });

    it("should use little-endian byte order", () => {
      // Manually construct a known Int16LE value: 256 = 0x0100
      // In little-endian: bytes [0x00, 0x01]
      const bytes = new Uint8Array([0x00, 0x01]);
      const base64 = btoa(String.fromCharCode(...bytes));
      const float32 = base64ToFloat32(base64);

      // 256 / 32768 ≈ 0.0078125
      expect(float32[0]).toBeCloseTo(256 / 32768, 6);
    });
  });
});
