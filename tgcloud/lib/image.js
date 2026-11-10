// tgcloud/lib/image.js
// KIUT rasmiy dars jadvali — Haqiqiy Times New Roman shriftida,
// oq fon va qora chiziqli toza jadval generatori (Kunlik va Haftalik)

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

export function cleanRoomName(room) {
  if (!room) return '—';
  let str = String(room).trim();
  str = str.replace(/computer\s*room/gi, '');
  str = str.replace(/computer\s*class/gi, '');
  str = str.replace(/computer/gi, '');
  str = str.replace(/lecture\s*\(new\s*campus\)/gi, '');
  str = str.replace(/\(new\s*campus\)/gi, '');
  str = str.replace(/lecture\s*room/gi, '');
  str = str.replace(/lecture/gi, '');
  str = str.replace(/auditoriya/gi, '');
  str = str.replace(/kabinet/gi, '');
  str = str.replace(/-?\s*xona\b/gi, '');
  str = str.replace(/\b([A-Za-z])(\d{3})\b/g, '$1-$2');
  str = str.replace(/^[-/\s,;:]+|[-/\s,;:]+$/g, '').trim();
  return str || '—';
}

const CYRILLIC_MAP = {
  'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'Yo','Ж':'J','З':'Z',
  'И':'I','Й':'Y','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R',
  'С':'S','Т':'T','У':'U','Ф':'F','Х':'X','Ц':'Ts','Ч':'Ch','Ш':'Sh','Щ':'Sh',
  'Ъ':"'",'Ы':'I','Ь':"'",'Э':'E','Ю':'Yu','Я':'Ya','а':'a','б':'b','в':'v',
  'г':'g','д':'d','е':'e','ё':'yo','ж':'j','з':'z','и':'i','й':'y','к':'k',
  'л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u',
  'ф':'f','х':'x','ц':'ts','ч':'ch','ш':'sh','щ':'sh','ъ':"'",'ы':'i','ь':"'",
  'э':'e','ю':'yu','я':'ya','Ў':'O‘','ў':'o‘','Қ':'Q','қ':'q','Ғ':'G‘','ғ':'g‘',
  'Ҳ':'H','ҳ':'h'
};

function normalizeText(str) {
  if (!str) return '';
  let out = '';
  for (const ch of String(str)) {
    if (CYRILLIC_MAP[ch]) out += CYRILLIC_MAP[ch];
    else if (ch === '‘' || ch === '’' || ch === '`') out += "'";
    else out += ch;
  }
  return out;
}

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

function measureTextWidth(text, scale = 1) {
  let w = 0;
  for (const ch of normalizeText(text)) {
    const glyph = TIMES_FONT[ch] || TIMES_FONT['?'] || TIMES_FONT[' '];
    const gw = glyph ? (glyph.w || 5) : 5;
    w += (gw + 1) * scale;
  }
  return w;
}

function drawText(data, width, height, text, startX, startY, scale = 1, forceColor = null, maxW = null) {
  let cursorX = startX;
  const str = normalizeText(text);

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const glyph = TIMES_FONT[ch] || TIMES_FONT['?'] || TIMES_FONT[' '];
    if (!glyph) {
      cursorX += 6 * scale;
      continue;
    }

    const charW = (glyph.w + 1) * scale;
    if (maxW != null && (cursorX + charW > startX + maxW)) {
      break;
    }

    const rows = glyph.rows || [];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const val = row[c];
        if (val === 0) continue;

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
    cursorX += charW;
  }
  return cursorX;
}

function drawTextCenter(data, width, height, text, centerX, startY, scale = 1, forceColor = null, maxW = null) {
  const tw = measureTextWidth(text, scale);
  let startX = Math.round(centerX - tw / 2);
  if (maxW != null && tw > maxW) {
    startX = Math.round(centerX - maxW / 2);
  }
  return drawText(data, width, height, text, startX, startY, scale, forceColor, maxW);
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

const KIUT_PERIOD_TIMES = {
  1: '8:00-8:50',
  2: '9:00-9:50',
  3: '10:00-10:50',
  4: '11:00-11:50',
  5: '12:00-12:50',
  6: '13:00-13:50',
  7: '14:00-14:50',
  8: '15:00-15:50',
  9: '16:00-16:50',
  10: '17:00-17:50',
  11: '18:00-18:50',
  12: '19:00-19:50',
};

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// 1. KUNLIK dars jadvali tasviri (Oq fon, toza jadval, xona faqat B-201 ko'rinishida)
export function generateScheduleImage(dayObj, groupName = '', titleText = 'DARSLAR JADVALI') {
  const rawLessons = dayObj?.l || dayObj?.lessons || [];
  const width = 840;
  const tableLeft = 20;
  const tableWidth = width - tableLeft * 2; // 800px

  const headerH = 75;
  const thH = 36;
  const rowH = 64;
  const count = Math.max(rawLessons.length, 1);
  const height = headerH + thH + (count * rowH) + 35;

  const pixels = new Uint8Array(width * height); // default 0: Oq fon

  // Sarlavha: Times New Roman shriftida guruh kodi markazda
  const displayGroup = groupName || "Guruh ko'rsatilmagan";
  drawTextCenter(pixels, width, height, displayGroup, width / 2, 16, 2);

  const dayName = dayObj?.day || '';
  const subTitle = `KIUT dars jadvali  |  ${dayName}  |  ${titleText}`;
  drawTextCenter(pixels, width, height, subTitle, width / 2, 48, 1, 5);

  const cols = [
    { title: 'Para / Vaqt', w: 150 },
    { title: 'Fan nomi', w: 320 },
    { title: "O'qituvchi", w: 200 },
    { title: 'Xona', w: 130 }
  ];

  // Header qatori
  let curX = tableLeft;
  for (const col of cols) {
    drawCell(pixels, width, height, curX, headerH, col.w, thH, 4, 1);
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

      // Col 0: Para va Vaqt
      drawCell(pixels, width, height, cx, curY, cols[0].w, rowH, 0, 1);
      drawTextCenter(pixels, width, height, `${pNum}-para`, cx + cols[0].w / 2, curY + 12, 1);
      if (timeStr) {
        drawTextCenter(pixels, width, height, timeStr, cx + cols[0].w / 2, curY + 36, 1, 5);
      }
      cx += cols[0].w;

      // Col 1: Fan nomi
      const subject = item.s || item.subject || "Noma'lum fan";
      drawCell(pixels, width, height, cx, curY, cols[1].w, rowH, 0, 1);
      drawText(pixels, width, height, subject, cx + 12, curY + 22, 1, 1, cols[1].w - 24);
      cx += cols[1].w;

      // Col 2: O'qituvchi
      const teacher = item.p || item.teacher || "—";
      drawCell(pixels, width, height, cx, curY, cols[2].w, rowH, 0, 1);
      drawText(pixels, width, height, teacher, cx + 12, curY + 22, 1, 1, cols[2].w - 24);
      cx += cols[2].w;

      // Col 3: Xona (Faqat B-201 ko'rinishida, computer room'siz)
      const room = cleanRoomName(item.r || item.room);
      drawCell(pixels, width, height, cx, curY, cols[3].w, rowH, 0, 1);
      drawTextCenter(pixels, width, height, room, cx + cols[3].w / 2, curY + 22, 1, 1, cols[3].w - 12);
      cx += cols[3].w;

      curY += rowH;
    }
  }

  drawText(pixels, width, height, 'KIUT Schedule Bot', tableLeft, curY + 10, 1, 5);
  return encodeIndexedPNG(width, height, pixels, PALETTE);
}

// 2. TO'LIQ HAFTALIK dars jadvali tasviri (Namunadagidek 6 kunlik katta jadval)
export function generateWeeklyScheduleImage(scheduleData) {
  const groupName = scheduleData.g || scheduleData.group || "Guruh ko'rsatilmagan";
  const days = scheduleData.d || scheduleData.days || [];

  // 12 ta para va 6 kun uchun xarita
  const gridMap = {};
  for (let p = 1; p <= 12; p++) gridMap[p] = {};

  for (let di = 0; di < WEEK_DAYS.length; di++) {
    const dayName = WEEK_DAYS[di];
    const dayObj = days.find(d => d.day?.toLowerCase().startsWith(dayName.toLowerCase().slice(0, 3)));
    const lessons = dayObj ? (dayObj.l || dayObj.lessons || []) : [];

    for (const l of lessons) {
      let pNum = l.period || l.p_num;
      if (!pNum && l.t) {
        const match = l.t.match(/^(\d{1,2}):/);
        if (match) {
          const h = Number(match[1]);
          if (h >= 8 && h <= 19) pNum = h - 7;
        }
      }
      if (pNum) {
        const matchRange = String(pNum).match(/(\d+)(?:\s*-\s*(\d+))?/);
        if (matchRange) {
          const sp = Number(matchRange[1]);
          const ep = matchRange[2] ? Number(matchRange[2]) : sp;
          for (let p = sp; p <= ep; p++) {
            if (p >= 1 && p <= 12) {
              gridMap[p][di] = l;
            }
          }
        }
      }
    }
  }

  const colTimeW = 85;
  const colDayW = 150;
  const tableLeft = 15;
  const totalTableW = colTimeW + (colDayW * 6); // 985px
  const width = totalTableW + tableLeft * 2; // 1015px

  const headerH = 70;
  const thH = 32;
  const rowH = 50; // Har bir para qatori balandligi
  const height = headerH + thH + (12 * rowH) + 30;

  const pixels = new Uint8Array(width * height); // default 0: oq fon

  // Sarlavha
  drawTextCenter(pixels, width, height, groupName, width / 2, 14, 2);
  drawTextCenter(pixels, width, height, 'KIUT to\'liq haftalik dars jadvali', width / 2, 44, 1, 5);

  // Header qatori
  let cx = tableLeft;
  drawCell(pixels, width, height, cx, headerH, colTimeW, thH, 4, 1);
  drawTextCenter(pixels, width, height, 'Para / Vaqt', cx + colTimeW / 2, headerH + 8, 1);
  cx += colTimeW;

  for (let di = 0; di < WEEK_DAYS.length; di++) {
    drawCell(pixels, width, height, cx, headerH, colDayW, thH, 4, 1);
    drawTextCenter(pixels, width, height, WEEK_DAYS[di], cx + colDayW / 2, headerH + 8, 1);
    cx += colDayW;
  }

  // 12 ta para qatorlari
  let curY = headerH + thH;
  for (let p = 1; p <= 12; p++) {
    let rowX = tableLeft;
    // Col 0: Para & Vaqt
    drawCell(pixels, width, height, rowX, curY, colTimeW, rowH, 4, 1);
    drawTextCenter(pixels, width, height, `${p}`, rowX + colTimeW / 2, curY + 6, 1);
    drawTextCenter(pixels, width, height, KIUT_PERIOD_TIMES[p] || '', rowX + colTimeW / 2, curY + 28, 1, 5);
    rowX += colTimeW;

    // 6 ta kun kataklari
    for (let di = 0; di < WEEK_DAYS.length; di++) {
      const lesson = gridMap[p][di];
      drawCell(pixels, width, height, rowX, curY, colDayW, rowH, 0, 1);

      if (lesson) {
        // O'qituvchi (tepada, kichik)
        const teacher = lesson.p || lesson.teacher || '';
        if (teacher) {
          drawText(pixels, width, height, teacher, rowX + 5, curY + 4, 1, 5, colDayW - 10);
        }
        // Fan nomi (o'rtada, to'q qora)
        const subject = lesson.s || lesson.subject || '';
        if (subject) {
          drawText(pixels, width, height, subject, rowX + 5, curY + 18, 1, 1, colDayW - 10);
        }
        // Xona (pastda, faqat B-201 ko'rinishida)
        const room = cleanRoomName(lesson.r || lesson.room);
        if (room && room !== '—') {
          drawText(pixels, width, height, room, rowX + 5, curY + 32, 1, 5, colDayW - 10);
        }
      }
      rowX += colDayW;
    }
    curY += rowH;
  }

  drawText(pixels, width, height, 'KIUT Schedule Bot', tableLeft, curY + 8, 1, 5);
  return encodeIndexedPNG(width, height, pixels, PALETTE);
}
