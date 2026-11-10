// tgcloud/lib/image.js
// KIUT rasmiy dars jadvali uslubidagi (oq fon, qora chiziqli jadval)
// ultra-tezkor (3-8 ms) toza JavaScript PNG generatori

// 1. Ixcham 5x7 pikselli shrift (ASCII 32-126)
const FONT_5X7 = {
  ' ': [0,0,0,0,0,0,0],
  '!': [4,4,4,4,0,0,4],
  '"': [10,10,10,0,0,0,0],
  '#': [10,10,31,10,31,10,10],
  '$': [4,15,20,14,5,30,4],
  '%': [25,26,4,8,19,25,0],
  '&': [12,18,20,8,21,18,13],
  "'": [4,4,2,0,0,0,0],
  '(': [2,4,8,8,8,4,2],
  ')': [8,4,2,2,2,4,8],
  '*': [0,4,21,14,21,4,0],
  '+': [0,4,4,31,4,4,0],
  ',': [0,0,0,0,4,4,2],
  '-': [0,0,0,31,0,0,0],
  '.': [0,0,0,0,0,6,6],
  '/': [1,2,4,8,16,0,0],
  '0': [14,17,19,21,25,17,14],
  '1': [4,12,4,4,4,4,14],
  '2': [14,17,1,2,4,8,31],
  '3': [31,2,4,2,1,17,14],
  '4': [2,6,10,18,31,2,2],
  '5': [31,16,30,1,1,17,14],
  '6': [6,8,16,30,17,17,14],
  '7': [31,1,2,4,8,8,8],
  '8': [14,17,17,14,17,17,14],
  '9': [14,17,17,15,1,2,12],
  ':': [0,12,12,0,12,12,0],
  ';': [0,12,12,0,12,4,2],
  '<': [2,4,8,16,8,4,2],
  '=': [0,31,0,31,0,0,0],
  '>': [8,4,2,1,2,4,8],
  '?': [14,17,1,2,4,0,4],
  '@': [14,17,1,13,21,21,14],
  'A': [14,17,17,31,17,17,17],
  'B': [30,17,17,30,17,17,30],
  'C': [14,17,16,16,16,17,14],
  'D': [28,18,17,17,17,18,28],
  'E': [31,16,16,30,16,16,31],
  'F': [31,16,16,30,16,16,16],
  'G': [14,17,16,23,17,17,15],
  'H': [17,17,17,31,17,17,17],
  'I': [14,4,4,4,4,4,14],
  'J': [1,1,1,1,1,17,14],
  'K': [17,18,20,24,20,18,17],
  'L': [16,16,16,16,16,16,31],
  'M': [17,27,21,21,17,17,17],
  'N': [17,17,25,21,19,17,17],
  'O': [14,17,17,17,17,17,14],
  'P': [30,17,17,30,16,16,16],
  'Q': [14,17,17,17,21,18,13],
  'R': [30,17,17,30,20,18,17],
  'S': [14,17,16,14,1,17,14],
  'T': [31,4,4,4,4,4,4],
  'U': [17,17,17,17,17,17,14],
  'V': [17,17,17,17,17,10,4],
  'W': [17,17,17,21,21,27,17],
  'X': [17,17,10,4,10,17,17],
  'Y': [17,17,17,10,4,4,4],
  'Z': [31,1,2,4,8,16,31],
  '[': [14,8,8,8,8,8,14],
  '\\': [16,8,4,2,1,0,0],
  ']': [14,2,2,2,2,2,14],
  '^': [4,10,17,0,0,0,0],
  '_': [0,0,0,0,0,0,31],
  '`': [8,4,2,0,0,0,0],
  'a': [0,0,14,1,15,17,15],
  'b': [16,16,22,25,17,17,30],
  'c': [0,0,14,17,16,17,14],
  'd': [1,1,13,19,17,17,15],
  'e': [0,0,14,17,31,16,14],
  'f': [6,9,8,28,8,8,8],
  'g': [0,15,17,17,15,1,14],
  'h': [16,16,22,25,17,17,17],
  'i': [4,0,12,4,4,4,14],
  'j': [2,0,6,2,2,18,12],
  'k': [16,16,18,20,24,20,18],
  'l': [12,4,4,4,4,4,14],
  'm': [0,0,26,21,21,17,17],
  'n': [0,0,22,25,17,17,17],
  'o': [0,0,14,17,17,17,14],
  'p': [0,0,30,17,30,16,16],
  'q': [0,0,13,19,15,1,1],
  'r': [0,0,22,25,16,16,16],
  's': [0,0,15,16,14,1,30],
  't': [8,8,28,8,8,9,6],
  'u': [0,0,17,17,17,19,13],
  'v': [0,0,17,17,17,10,4],
  'w': [0,0,17,17,21,21,10],
  'x': [0,0,17,10,4,10,17],
  'y': [0,0,17,17,15,1,14],
  'z': [0,0,31,2,4,8,31],
  '{': [2,4,4,8,4,4,2],
  '|': [4,4,4,4,4,4,4],
  '}': [8,4,4,2,4,4,8],
  '~': [0,8,21,2,0,0,0],
};

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

// 2. 4 rangli oddiy oq-qora palitra:
// 0: Oq fon (#ffffff)
// 1: Qora chiziq va asosiy matn (#000000)
// 2: Och kulrang katak sarlavhasi (#f1f5f9)
// 3: To'q kulrang ikkinchi darajali matn (#475569)
const PALETTE = new Uint8Array([
  255, 255, 255, // 0: Oq (#ffffff)
  0, 0, 0,       // 1: Qora (#000000)
  241, 245, 249, // 2: Och kulrang (#f1f5f9)
  71, 85, 105    // 3: To'q kulrang (#475569)
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

function drawText(data, width, height, text, startX, startY, colorIdx = 1, scale = 1) {
  const normalized = normalizeText(text);
  let cursorX = startX;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const glyph = FONT_5X7[ch] || FONT_5X7['?'] || FONT_5X7[' '];
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 5; col++) {
        if ((bits & (16 >> col)) !== 0) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              setPixel(data, width, height, cursorX + col * scale + sx, startY + row * scale + sy, colorIdx);
            }
          }
        }
      }
    }
    cursorX += 6 * scale;
  }
  return cursorX;
}

function drawTextCenter(data, width, height, text, centerX, startY, colorIdx = 1, scale = 1) {
  const normalized = normalizeText(text);
  const textWidth = normalized.length * 6 * scale;
  const startX = Math.round(centerX - textWidth / 2);
  return drawText(data, width, height, normalized, startX, startY, colorIdx, scale);
}

// 3. Ultra-tezkor Indexed-color PNG kodlovchisi
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

// 4. KUNLIK dars jadvali — Namunadagidek oq fonda toza jadval shaklida
export function generateScheduleImage(dayObj, groupName = '', titleText = 'DARSLAR JADVALI') {
  const rawLessons = dayObj?.l || dayObj?.lessons || [];
  const width = 800;
  const tableLeft = 20;
  const tableWidth = width - tableLeft * 2; // 760px

  const headerH = 75;
  const thH = 34; // Table Header balandligi
  const rowH = 62; // Har bir dars qatori balandligi
  const count = Math.max(rawLessons.length, 1);
  const height = headerH + thH + (count * rowH) + 35;

  const pixels = new Uint8Array(width * height); // default 0: Oq fon

  // 1. Sarlavha: Namunadagidek guruh kodi markazda katta qora shriftda
  const displayGroup = groupName || "Guruh ko'rsatilmagan";
  drawTextCenter(pixels, width, height, displayGroup, width / 2, 18, 1, 3); // 3x katta qora yozuv

  const dayName = dayObj?.day || '';
  const subTitle = `KIUT dars jadvali  |  ${dayName}  |  ${titleText}`;
  drawTextCenter(pixels, width, height, subTitle, width / 2, 48, 3, 1);

  // 2. Jadval ustunlari:
  // Col 0: Para & Vaqt (150px)
  // Col 1: Fan nomi (280px)
  // Col 2: O'qituvchi (190px)
  // Col 3: Xona (140px)
  const cols = [
    { title: 'Para / Vaqt', w: 150 },
    { title: 'Fan nomi', w: 280 },
    { title: "O'qituvchi", w: 190 },
    { title: 'Xona', w: 140 }
  ];

  // Sarlavha qatori (Table Header)
  let curX = tableLeft;
  for (const col of cols) {
    drawCell(pixels, width, height, curX, headerH, col.w, thH, 2, 1); // 2: och kulrang fon
    drawTextCenter(pixels, width, height, col.title, curX + col.w / 2, headerH + 12, 1, 1);
    curX += col.w;
  }

  // Darslar qatorlari
  let curY = headerH + thH;
  if (rawLessons.length === 0) {
    drawCell(pixels, width, height, tableLeft, curY, tableWidth, rowH, 0, 1);
    drawTextCenter(pixels, width, height, "Bugun darslar rejalashtirilmagan.", width / 2, curY + 24, 1, 2);
  } else {
    for (let i = 0; i < rawLessons.length; i++) {
      const item = rawLessons[i];
      let cx = tableLeft;
      const pNum = item.period ? `${item.period}` : `${i + 1}`;
      const timeStr = item.t || (item.start_time && item.end_time ? `${item.start_time}-${item.end_time}` : '');

      // Col 0: Para va Vaqt (Namunadagidek katta raqam va ostida vaqt)
      drawCell(pixels, width, height, cx, curY, cols[0].w, rowH, 0, 1);
      drawTextCenter(pixels, width, height, pNum, cx + cols[0].w / 2, curY + 12, 1, 3); // 3x katta para raqami
      if (timeStr) {
        drawTextCenter(pixels, width, height, timeStr, cx + cols[0].w / 2, curY + 40, 3, 1);
      }
      cx += cols[0].w;

      // Col 1: Fan nomi
      const subject = item.s || item.subject || "Noma'lum fan";
      drawCell(pixels, width, height, cx, curY, cols[1].w, rowH, 0, 1);
      drawText(pixels, width, height, subject, cx + 12, curY + 24, 1, 1);
      cx += cols[1].w;

      // Col 2: O'qituvchi
      const teacher = item.p || item.teacher || "—";
      drawCell(pixels, width, height, cx, curY, cols[2].w, rowH, 0, 1);
      drawText(pixels, width, height, teacher, cx + 12, curY + 24, 1, 1);
      cx += cols[2].w;

      // Col 3: Xona
      const room = item.r || item.room || "—";
      drawCell(pixels, width, height, cx, curY, cols[3].w, rowH, 0, 1);
      drawText(pixels, width, height, room, cx + 12, curY + 24, 1, 1);
      cx += cols[3].w;

      curY += rowH;
    }
  }

  // Footer: burchakda rasmiy yozuv
  drawText(pixels, width, height, 'KIUT Schedule Bot', tableLeft, curY + 12, 3, 1);

  return encodeIndexedPNG(width, height, pixels, PALETTE);
}
