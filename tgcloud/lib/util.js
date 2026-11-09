// tgcloud/lib/util.js
// V8 muhitida Uint8Array baytlarini xavfsiz Base64 ga o'tkazish yordamchisi

export function uint8ArrayToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000; // Call stack overflow bo'lmasligi uchun 32KB bo'laklarda
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

