import { randomUUIDv7 } from "bun";
import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { Buffer } from "node:buffer";
import { closeSync, createWriteStream, mkdirSync, openSync, writeSync } from "node:fs";

const audioStreamRouter = new Hono();

audioStreamRouter.get(
  '/ws',
  upgradeWebSocket((c) => {
    const id = randomUUIDv7();
    const dir = "./tmp/recordings";
    const filePath = `${dir}/${id}.wav`;
    let writeStream: import("node:fs").WriteStream | null = null;
    let totalBytes = 0;

    function createWavHeader(sampleRate: number, channels: number, bitsPerSample: number, dataLength: number) {
      const header = Buffer.alloc(44);
      header.write("RIFF", 0);
      header.writeUInt32LE(36 + dataLength, 4);
      header.write("WAVE", 8);
      header.write("fmt ", 12);
      header.writeUInt32LE(16, 16);
      header.writeUInt16LE(1, 20);
      header.writeUInt16LE(channels, 22);
      header.writeUInt32LE(sampleRate, 24);
      const byteRate = (sampleRate * channels * bitsPerSample) / 8;
      header.writeUInt32LE(byteRate, 28);
      const blockAlign = (channels * bitsPerSample) / 8;
      header.writeUInt16LE(blockAlign, 32);
      header.writeUInt16LE(bitsPerSample, 34);
      header.write("data", 36);
      header.writeUInt32LE(dataLength, 40);
      return header;
    }

    return {
      onOpen: (ws) => {
        c.set('id', id);
        mkdirSync(dir, { recursive: true });
        writeStream = createWriteStream(filePath);
        writeStream.write(createWavHeader(48000, 1, 16, 0));
        console.log(`Recording audio to ${filePath}`);
      },
      async onMessage(event) {
        if (!writeStream) return;

        const data = event.data;
        let buf: Buffer | null = null;

        if (data instanceof ArrayBuffer) {
          buf = Buffer.from(data);
        } else if (data instanceof Uint8Array) {
          buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
        } else if (data && typeof (data as any).arrayBuffer === "function") {
          const ab = await (data as any).arrayBuffer();
          buf = Buffer.from(ab);
        } else {
          return;
        }

        writeStream.write(buf);
        totalBytes += buf.length;
      },
      async onClose() {
        if (writeStream) {
          await new Promise<void>((resolve) => writeStream!.end(() => resolve()));
          writeStream = null;
        }
        try {
          const fd = openSync(filePath, "r+");
          const riffSize = 36 + totalBytes;
          const dataSize = totalBytes;
          const tmp = Buffer.alloc(4);
          tmp.writeUInt32LE(riffSize, 0);
          writeSync(fd, tmp, 0, 4, 4);
          tmp.writeUInt32LE(dataSize, 0);
          writeSync(fd, tmp, 0, 4, 40);
          closeSync(fd);
          console.log(`Finalized WAV ${filePath} (${dataSize} bytes of audio)`);
        } catch (err) {
          console.error("Failed to finalize WAV file", err);
        }
      }
    };
  })
);

export {
  audioStreamRouter
};
