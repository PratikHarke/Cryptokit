// ─── Caesar / ROT-13 ──────────────────────────────────────────────────────────

export function caesarEnc(text, shift) {
  shift = ((shift % 26) + 26) % 26;
  return text.split("").map(c => {
    if (/[a-z]/.test(c)) return String.fromCharCode(((c.charCodeAt(0) - 97 + shift) % 26) + 97);
    if (/[A-Z]/.test(c)) return String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65);
    return c;
  }).join("");
}

export function caesarDec(text, shift) {
  return caesarEnc(text, -shift);
}

export function rot13(text) {
  return caesarEnc(text, 13);
}

export function caesarBrute(text) {
  return Array.from({ length: 26 }, (_, i) => ({
    shift: i,
    text: caesarDec(text, i),
  }));
}
