import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(rootDir, 'public', 'icons');
const crcTable = new Uint32Array(256);

for (let n = 0; n < 256; n += 1) {
  let value = n;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  }
  crcTable[n] = value >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

function createIcon(size, maskable = false) {
  const stride = 1 + size * 4;
  const raw = Buffer.alloc(stride * size);
  const center = (size - 1) / 2;
  const radius = size * (maskable ? 0.35 : 0.39);

  for (let y = 0; y < size; y += 1) {
    const row = y * stride;
    for (let x = 0; x < size; x += 1) {
      const offset = row + 1 + x * 4;
      const dx = x - center;
      const dy = y - center;
      const inCircle = dx * dx + dy * dy <= radius * radius;
      const vertical = x >= size * 0.39 && x <= size * 0.48 && y >= size * 0.29 && y <= size * 0.65;
      const horizontal = x >= size * 0.39 && x <= size * 0.65 && y >= size * 0.57 && y <= size * 0.65;
      const logo = vertical || horizontal;
      const accent = inCircle || logo;
      raw[offset] = accent ? 0x25 : 0x0f;
      raw[offset + 1] = accent ? 0x63 : 0x17;
      raw[offset + 2] = accent ? 0xeb : 0x2a;
      if (logo && inCircle) {
        raw[offset] = 0xff;
        raw[offset + 1] = 0xff;
        raw[offset + 2] = 0xff;
      }
      raw[offset + 3] = 0xff;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

fs.mkdirSync(outputDir, { recursive: true });
for (const [name, size, maskable] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false]
]) {
  fs.writeFileSync(path.join(outputDir, name), createIcon(size, maskable));
}
