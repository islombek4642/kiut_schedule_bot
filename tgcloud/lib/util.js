// tgcloud/lib/util.js
// V8 muhitida (btoa va Node Buffer mavjud bo'lmaganda) Uint8Array baytlarini
// 100% toza va tezkor Base64 formatiga o'tkazuvchi funksiya

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function uint8ArrayToBase64(bytes) {
  // Agar zamonaviy V8 da bytes.toBase64() mavjud bo'lsa
  if (typeof bytes.toBase64 === 'function') {
    return bytes.toBase64();
  }

  let result = '';
  const len = bytes.length;
  let i = 0;

  // Har 3 baytni 4 ta base64 belgiga o'tkazamiz
  for (; i + 2 < len; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    result += CHARS[a >> 2] +
              CHARS[((a & 3) << 4) | (b >> 4)] +
              CHARS[((b & 15) << 2) | (c >> 6)] +
              CHARS[c & 63];
  }

  // Qolgan 1 yoki 2 bayt uchun padding (=)
  if (i < len) {
    const a = bytes[i];
    if (i + 1 < len) {
      const b = bytes[i + 1];
      result += CHARS[a >> 2] +
                CHARS[((a & 3) << 4) | (b >> 4)] +
                CHARS[(b & 15) << 2] +
                '=';
    } else {
      result += CHARS[a >> 2] +
                CHARS[(a & 3) << 4] +
                '==';
    }
  }

  return result;
}
