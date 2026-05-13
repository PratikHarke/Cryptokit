// ─── Atbash Cipher ────────────────────────────────────────────────────────────

export function atbash(text) {
  return text.split("").map(c => {
    if (/[a-z]/.test(c)) return String.fromCharCode(122 - (c.charCodeAt(0) - 97));
    if (/[A-Z]/.test(c)) return String.fromCharCode(90  - (c.charCodeAt(0) - 65));
    return c;
  }).join("");
}
