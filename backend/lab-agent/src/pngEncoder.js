const zlib = require('zlib');

/**
 * A tiny, correct PNG encoder for solid-color-with-a-moving-bar images.
 * No native dependencies (no canvas/sharp) — just zlib, which is built
 * into Node. This exists purely so cameraCapture.js can produce real,
 * valid, visibly-changing image frames for the live view before a real
 * camera is wired up. Swap this module out (not cameraCapture.js's
 * public interface) once real frame grabbing exists.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);

  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
}

/**
 * Renders a background color with a vertical bar that sweeps left to
 * right based on frameNumber — enough visible motion to prove frames are
 * actually distinct, without needing text/font rendering.
 */
function renderPixels(width, height, frameNumber) {
  const bg = [16, 32, 50]; // dark navy, matches the frontend's palette
  const bar = [63, 224, 197]; // cyan accent

  const barWidth = Math.max(4, Math.floor(width / 12));
  const barX = frameNumber % (width - barWidth);

  const raw = Buffer.alloc(height * (1 + width * 3)); // +1 filter byte per row
  let offset = 0;

  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0; // filter type: none
    offset += 1;
    for (let x = 0; x < width; x += 1) {
      const isBar = x >= barX && x < barX + barWidth;
      const [r, g, b] = isBar ? bar : bg;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      offset += 3;
    }
  }

  return raw;
}

/**
 * Encodes a full PNG buffer for one simulated camera frame.
 */
function encodeFrame(width, height, frameNumber) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: truecolor (RGB)
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method

  const rawPixels = renderPixels(width, height, frameNumber);
  const idatData = zlib.deflateSync(rawPixels);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdrData),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

module.exports = { encodeFrame };
