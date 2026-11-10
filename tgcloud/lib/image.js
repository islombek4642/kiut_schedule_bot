// tgcloud/lib/image.js
// KIUT rasmiy dars jadvali — Haqiqiy Times New Roman shriftida,
// oq fon va qora chiziqli toza jadval generatori (Pure JS, 5-15 ms)

import { TIMES_FONT } from './times_font.js';

// 6 rangli palitra:
// 0: Sof oq fon (#ffffff)
// 1: Qora matn va to'r chiziqlari (#000000)
// 2: Qoramtir kulrang — Times New Roman silliqlash (Anti-aliasing) (#555555)
// 3: Och kulrang — Times New Roman silliqlash (#b4b4b4)
// 4: Jadval sarlavhasi foni (#f8fafc)
// 5: Yordamchi matn kulrangi (#64748b)
const PALETTE = new Uint8Array([
  255, 255, 255, // 0: Oq
  0, 0, 0,       // 1: Qora
  85, 85, 85,    // 2: Qoramtir kulrang
  180, 180, 180, // 3: Och kulrang
  248, 250, 252, // 4: Sarlavha foni
  100, 116, 139  // 5: Yordamchi kulrang
]);

function setPixel(data, width, height, x, y, colorIdx) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  data[y * width + x] = colorIdx;
}

function fillRect(data, width, height, x, y, w, h, colorIdx) {
  const xEnd = Math.min(x + w, width);
  const yEnd = Math.min(y + h, height);
  for (let py = Math.max(0, y); py < yEnd; py++) {
    const rowOffset = py * width;
    for (let px = Math.max(0, x); px < xEnd; px++) {
      data[rowOffset + px] = colorIdx;
    }
  }
}

function drawLineH(data, width, height, x, y, len, colorIdx = 1) {
  for (let px = x; px < Math.min(x + len, width); px++) {
    setPixel(data, width, height, px, y, colorIdx);
  }
}

function drawLineV(data, width, height, x, y, len, colorIdx = 1) {
  for (let py = y; py < Math.min(y + len, height); py++) {
    setPixel(data, width, height, x, py, colorIdx);
  }
}

function drawCell(data, width, height, x, y, w, h, bgIdx = 0, borderIdx = 1) {
  fillRect(data, width, height, x, y, w, h, bgIdx);
  drawLineH(data, width, height, x, y, w, borderIdx);
  drawLineH(data, width, height, x, y + h - 1, w, borderIdx);
  drawLineV(data, width, height, x, y, h, borderIdx);
  drawLineV(data, width, height, x + w - 1, y, h, borderIdx);
}

// Times New Roman shriftida matn yozish (Anti-aliased)
function measureTextWidth(text, scale = 1) {
  let w = 0;
  for (const ch of String(text || '')) {
    const glyph = TIMES_FONT[ch] || TIMES_FONT['?'] || TIMES_FONT[' '];
    const gw = glyph ? (glyph.w || 5) : 5;
    w += (gw + 1) * scale;
  }
  return w;
}

function drawText(data, width, height, text, startX, startY, scale = 1, forceColor = null) {
  let cursorX = startX;
  const str = String(text || '');

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const glyph = TIMES_FONT[ch] || TIMES_FONT['?'] || TIMES_FONT[' '];
    if (!glyph) {
      cursorX += 6 * scale;
      continue;
    }

    const rows = glyph.rows || [];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const val = row[c];
        if (val === 0) continue; // Shaffof fon

        // val: 1 = Qora, 2 = Qoramtir kulrang, 3 = Och kulrang
        const colorIdx = forceColor != null ? forceColor : val;

        if (scale === 1) {
          setPixel(data, width, height, cursorX + c, startY + r, colorIdx);
        } else {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              setPixel(data, width, height, cursorX + c * scale + sx, startY + r * scale + sy, colorIdx);
            }
          }
        }
      }
    }
    cursorX += (glyph.w + 1) * scale;
  }
  return cursorX;
}

function drawTextCenter(data, width, height, text, centerX, startY, scale = 1, forceColor = null) {
  const tw = measureTextWidth(text, scale);
  const startX = Math.round(centerX - tw / 2);
  return drawText(data, width, height, text, startX, startY, scale, forceColor);
}

// Ultra-tezkor Indexed-color PNG kodlovchisi
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  return table;
}
const CRC_TABLE = makeCrcTable();

function crc32(buf, offset, length) {
  let c = 0xffffffff;
  for (let i = offset; i < offset + length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(buf, offset, length) {
  let a = 1, b = 0;
  for (let i = offset; i < offset + length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function encodeIndexedPNG(w, h, pixelIndices, paletteRGB) {
  const rowLen = 1 + w;
  const rawData = new Uint8Array(rowLen * h);
  for (let y = 0; y < h; y++) {
    rawData[y * rowLen] = 0;
    rawData.set(pixelIndices.subarray(y * w, (y + 1) * w), y * rowLen + 1);
  }

  const BLOCK_MAX = 65535;
  const numBlocks = Math.ceil(rawData.length / BLOCK_MAX) || 1;
  const zlibLen = 2 + (numBlocks * 5) + rawData.length + 4;
  const zlib = new Uint8Array(zlibLen);
  zlib[0] = 0x78;
  zlib[1] = 0x01;
  let zPos = 2;

  for (let b = 0; b < numBlocks; b++) {
    const isLast = (b === numBlocks - 1);
    const start = b * BLOCK_MAX;
    const end = Math.min(start + BLOCK_MAX, rawData.length);
    const len = end - start;
    zlib[zPos++] = isLast ? 1 : 0;
    zlib[zPos++] = len & 0xff;
    zlib[zPos++] = (len >> 8) & 0xff;
    const nlen = (~len) & 0xffff;
    zlib[zPos++] = nlen & 0xff;
    zlib[zPos++] = (nlen >> 8) & 0xff;
    zlib.set(rawData.subarray(start, end), zPos);
    zPos += len;
  }

  const adler = adler32(rawData, 0, rawData.length);
  zlib[zPos++] = (adler >> 24) & 0xff;
  zlib[zPos++] = (adler >> 16) & 0xff;
  zlib[zPos++] = (adler >> 8) & 0xff;
  zlib[zPos++] = adler & 0xff;

  const plteLen = paletteRGB.length;
  const totalLen = 8 + 25 + (12 + plteLen) + (12 + zlib.length) + 12;
  const png = new Uint8Array(totalLen);
  let pos = 0;

  // PNG Signature
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], pos);
  pos += 8;

  function writeChunk(typeStr, data) {
    const len = data.length;
    png[pos++] = (len >> 24) & 0xff;
    png[pos++] = (len >> 16) & 0xff;
    png[pos++] = (len >> 8) & 0xff;
    png[pos++] = len & 0xff;
    const typeStart = pos;
    for (let i = 0; i < 4; i++) png[pos++] = typeStr.charCodeAt(i);
    png.set(data, pos);
    pos += len;
    const c = crc32(png, typeStart, 4 + len);
    png[pos++] = (c >> 24) & 0xff;
    png[pos++] = (c >> 16) & 0xff;
    png[pos++] = (c >> 8) & 0xff;
    png[pos++] = c & 0xff;
  }

  const ihdr = new Uint8Array(13);
  ihdr[0] = (w >> 24) & 0xff; ihdr[1] = (w >> 16) & 0xff; ihdr[2] = (w >> 8) & 0xff; ihdr[3] = w & 0xff;
  ihdr[4] = (h >> 24) & 0xff; ihdr[5] = (h >> 16) & 0xff; ihdr[6] = (h >> 8) & 0xff; ihdr[7] = h & 0xff;
  ihdr[8] = 8;
  ihdr[9] = 3; // Indexed color
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  writeChunk('IHDR', ihdr);
  writeChunk('PLTE', paletteRGB);
  writeChunk('IDAT', zlib);
  writeChunk('IEND', new Uint8Array(0));

  return png;
}

// Asosiy dars jadvali tasvir generatori (Times New Roman shriftida, oq fonda)
export function generateScheduleImage(dayObj, groupName = '', titleText = 'DARSLAR JADVALI') {
  const rawLessons = dayObj?.l || dayObj?.lessons || [];
  const width = 840;
  const tableLeft = 20;
  const tableWidth = width - tableLeft * 2; // 800px

  const headerH = 75;
  const thH = 36; // Table Header balandligi
  const rowH = 64; // Har bir dars qatori balandligi
  const count = Math.max(rawLessons.length, 1);
  const height = headerH + thH + (count * rowH) + 35;

  const pixels = new Uint8Array(width * height); // default 0: Sof oq fon

  // 1. Sarlavha: Times New Roman shriftida katta guruh kodi markazda
  const displayGroup = groupName || "Guruh ko'rsatilmagan";
  drawTextCenter(pixels, width, height, displayGroup, width / 2, 16, 2); // 2x Times New Roman

  const dayName = dayObj?.day || '';
  const subTitle = `KIUT dars jadvali  |  ${dayName}  |  ${titleText}`;
  drawTextCenter(pixels, width, height, subTitle, width / 2, 48, 1, 5); // 1x Times New Roman (kulrang)

  // 2. Jadval ustunlari:
  const cols = [
    { title: 'Para / Vaqt', w: 150 },
    { title: 'Fan nomi', w: 320 },
    { title: "O'qituvchi", w: 190 },
    { title: 'Xona', w: 140 }
  ];

  // Sarlavha qatori (Table Header)
  let curX = tableLeft;
  for (const col of cols) {
    drawCell(pixels, width, height, curX, headerH, col.w, thH, 4, 1); // 4: och fon, 1: qora border
    drawTextCenter(pixels, width, height, col.title, curX + col.w / 2, headerH + 9, 1);
    curX += col.w;
  }

  // Darslar qatorlari
  let curY = headerH + thH;
  if (rawLessons.length === 0) {
    drawCell(pixels, width, height, tableLeft, curY, tableWidth, rowH, 0, 1);
    drawTextCenter(pixels, width, height, "Bugun darslar rejalashtirilmagan.", width / 2, curY + 22, 1);
  } else {
    for (let i = 0; i < rawLessons.length; i++) {
      const item = rawLessons[i];
      let cx = tableLeft;
      const pNum = item.period ? `${item.period}` : `${i + 1}`;
      const timeStr = item.t || (item.start_time && item.end_time ? `${item.start_time}-${item.end_time}` : '');

      // Col 0: Para va Vaqt (Katta para raqami va ostida vaqt)
      drawCell(pixels, width, height, cx, curY, cols[0].w, rowH, 0, 1);
      drawTextCenter(pixels, width, height, `${pNum}-para`, cx + cols[0].w / 2, curY + 12, 1);
      if (timeStr) {
        drawTextCenter(pixels, width, height, timeStr, cx + cols[0].w / 2, curY + 36, 1, 5);
      }
      cx += cols[0].w;

      // Col 1: Fan nomi
      const subject = item.s || item.subject || "Noma'lum fan";
      drawCell(pixels, width, height, cx, curY, cols[1].w, rowH, 0, 1);
      drawText(pixels, width, height, subject, cx + 12, curY + 22, 1);
      cx += cols[1].w;

      // Col 2: O'qituvchi
      const teacher = item.p || item.teacher || "—";
      drawCell(pixels, width, height, cx, curY, cols[2].w, rowH, 0, 1);
      drawText(pixels, width, height, teacher, cx + 12, curY + 22, 1);
      cx += cols[2].w;

      // Col 3: Xona
      const room = item.r || item.room || "—";
      drawCell(pixels, width, height, cx, curY, cols[3].w, rowH, 0, 1);
      drawText(pixels, width, height, room, cx + 12, curY + 22, 1);
      cx += cols[3].w;

      curY += rowH;
    }
  }

  // Footer: Times New Roman yozuv
  drawText(pixels, width, height, 'KIUT Schedule Bot', tableLeft, curY + 10, 1, 5);

  return encodeIndexedPNG(width, height, pixels, PALETTE);
}
