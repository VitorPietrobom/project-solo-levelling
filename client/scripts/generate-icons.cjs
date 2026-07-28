// One-off icon generator — pure Node, no deps. Renders the Project Arise
// app icon (teal→violet gradient rounded square with a white lightning bolt)
// as PNGs at the sizes a PWA needs.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public');

// oklch brand colors approximated in sRGB
const ACCENT = [79, 209, 197];   // teal  (--accent)
const ACCENT2 = [150, 110, 230]; // violet (--accent-2)
const BG0 = [30, 30, 46];

function lerp(a, b, t) { return a + (b - a) * t; }
function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }

// Lightning bolt polygon in a 0..1 unit box (roughly centered)
const BOLT = [
  [0.56, 0.10], [0.30, 0.55], [0.46, 0.55],
  [0.40, 0.90], [0.70, 0.42], [0.52, 0.42], [0.62, 0.10],
];

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function renderPNG(size, maskable) {
  const pad = maskable ? Math.round(size * 0.10) : 0; // safe zone for maskable
  const inner = size - pad * 2;
  const radius = maskable ? size / 2 : size * 0.22; // maskable → circle-safe, else rounded square
  const cx = size / 2, cy = size / 2;

  // RGBA buffer
  const data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // background shape mask (rounded square)
      let inShape;
      if (maskable) {
        inShape = true; // fill whole canvas; launcher applies mask
      } else {
        const dx = Math.max(Math.abs(x - cx) - (size / 2 - radius), 0);
        const dy = Math.max(Math.abs(y - cy) - (size / 2 - radius), 0);
        inShape = Math.sqrt(dx * dx + dy * dy) <= radius + 0.5;
      }

      if (!inShape) {
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
        continue;
      }

      // diagonal gradient teal → violet
      const t = ((x / size) + (y / size)) / 2;
      let [r, g, b] = mix(ACCENT, ACCENT2, t);

      // bolt in unit coords relative to inner area
      const ux = (x - pad) / inner;
      const uy = (y - pad) / inner;
      if (ux >= 0 && ux <= 1 && uy >= 0 && uy <= 1 && pointInPoly(ux, uy, BOLT)) {
        r = 255; g = 255; b = 255;
      }

      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  return encodePNG(size, size, data);
}

// Minimal PNG encoder (truecolor + alpha)
function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  function chunk(type, body) {
    const len = Buffer.alloc(4); len.writeUInt32BE(body.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, body])), 0);
    return Buffer.concat([len, typeBuf, body, crc]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-192.png', 192, true],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
];
for (const [name, size, maskable] of targets) {
  fs.writeFileSync(path.join(OUT, name), renderPNG(size, maskable));
  console.log('wrote', name, size);
}
