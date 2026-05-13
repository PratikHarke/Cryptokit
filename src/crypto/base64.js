// ─── Base64 Encoding ──────────────────────────────────────────────────────────
// Uses TextEncoder/TextDecoder for full Unicode support.
// The deprecated escape()/unescape() pattern has been removed.

export function b64Enc(text) {
  try {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  } catch {
    return "Encoding error";
  }
}

export function b64Dec(text) {
  try {
    const binary = atob(text.trim());
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "Invalid Base64";
  }
}
