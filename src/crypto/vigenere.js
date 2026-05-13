// ─── Vigenère Cipher ──────────────────────────────────────────────────────────

export function vigEnc(text, key) {
  const k = key.toUpperCase().replace(/[^A-Z]/g, "");
  if (!k) return text;
  let ki = 0;
  return text.split("").map(c => {
    if (/[a-z]/.test(c)) {
      const r = String.fromCharCode(((c.charCodeAt(0) - 97 + k.charCodeAt(ki % k.length) - 65) % 26) + 97);
      ki++;
      return r;
    }
    if (/[A-Z]/.test(c)) {
      const r = String.fromCharCode(((c.charCodeAt(0) - 65 + k.charCodeAt(ki % k.length) - 65) % 26) + 65);
      ki++;
      return r;
    }
    return c;
  }).join("");
}

export function vigDec(text, key) {
  const k = key.toUpperCase().replace(/[^A-Z]/g, "");
  if (!k) return text;
  let ki = 0;
  return text.split("").map(c => {
    if (/[a-z]/.test(c)) {
      const r = String.fromCharCode(((c.charCodeAt(0) - 97 - (k.charCodeAt(ki % k.length) - 65) + 26) % 26) + 97);
      ki++;
      return r;
    }
    if (/[A-Z]/.test(c)) {
      const r = String.fromCharCode(((c.charCodeAt(0) - 65 - (k.charCodeAt(ki % k.length) - 65) + 26) % 26) + 65);
      ki++;
      return r;
    }
    return c;
  }).join("");
}
