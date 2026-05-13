// ─── XOR Cipher ───────────────────────────────────────────────────────────────
import { parseHex } from "./hexParser.js";

export function xorEnc(text, key) {
  if (!key) return "";
  const enc = new TextEncoder();
  const tb = enc.encode(text);
  const kb = enc.encode(key);
  return Array.from(tb)
    .map((b, i) => b ^ kb[i % kb.length])
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export function xorDec(hex, key) {
  if (!key) return "Key is required.";
  const parsed = parseHex(hex);
  if (parsed.error) return parsed.error;
  const kb = new TextEncoder().encode(key);
  const dec = new Uint8Array(parsed.bytes.map((b, i) => b ^ kb[i % kb.length]));
  return new TextDecoder().decode(dec);
}

/**
 * XOR decode from raw bytes (Uint8Array) with a string key.
 * Used internally by solvers/chain tools.
 */
export function xorDecBytes(bytes, key) {
  if (!key) return null;
  const kb = new TextEncoder().encode(key);
  const dec = new Uint8Array(bytes.map((b, i) => b ^ kb[i % kb.length]));
  return new TextDecoder().decode(dec);
}
