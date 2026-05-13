import { scoreText } from "./analysis.js";

// ─── Hamming Distance ─────────────────────────────────────────────────────────

export function hammingDistance(a, b) {
  let dist = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    let xor = a[i] ^ b[i];
    while (xor) { dist += xor & 1; xor >>= 1; }
  }
  return dist;
}

// ─── Key Length Detection via Normalized Edit Distance ───────────────────────

export function findKeyLengths(bytes, maxLen = 40) {
  const results = [];
  for (let kl = 2; kl <= Math.min(maxLen, Math.floor(bytes.length / 4)); kl++) {
    let totalDist = 0;
    let count = 0;
    // Average across up to 6 block pairs for better accuracy
    for (let i = 0; i + kl * 2 <= bytes.length && count < 6; i += kl) {
      const a = bytes.slice(i, i + kl);
      const b = bytes.slice(i + kl, i + kl * 2);
      totalDist += hammingDistance(a, b) / kl;
      count++;
    }
    if (count > 0) results.push({ keyLen: kl, score: totalDist / count });
  }
  return results.sort((a, b) => a.score - b.score).slice(0, 6);
}

// ─── Single-Byte Crack for One Column ────────────────────────────────────────

function crackSingleByte(bytes) {
  let bestKey = 0, bestScore = -Infinity, bestText = "";
  for (let k = 0; k < 256; k++) {
    const decoded = new Uint8Array(bytes.map(b => b ^ k));
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(decoded); }
    catch { continue; }
    const score = scoreText(text);
    if (score > bestScore) { bestScore = score; bestKey = k; bestText = text; }
  }
  return { key: bestKey, score: bestScore };
}

// ─── Full Repeating-Key XOR Cracker ──────────────────────────────────────────

export function crackRepeatingXor(hex) {
  const clean = hex.replace(/\s+/g, "");
  if (!clean.match(/^[0-9a-fA-F]+$/) || clean.length % 2 !== 0)
    return { error: "Input must be valid even-length hex." };

  const bytes = Uint8Array.from(clean.match(/.{2}/g).map(h => parseInt(h, 16)));
  if (bytes.length < 8) return { error: "Need at least 8 bytes." };

  const keyLengthCandidates = findKeyLengths(bytes);
  const results = [];

  for (const { keyLen, score: klScore } of keyLengthCandidates) {
    // Split bytes into keyLen columns
    const columns = Array.from({ length: keyLen }, (_, col) =>
      bytes.filter((_, i) => i % keyLen === col)
    );

    // Crack each column independently
    const keyBytes = columns.map(col => crackSingleByte(col).key);
    const keyHex = keyBytes.map(b => b.toString(16).padStart(2, "0")).join(" ");
    let keyStr = "";
    try { keyStr = new TextDecoder("utf-8").decode(Uint8Array.from(keyBytes)); }
    catch { keyStr = keyHex; }

    // Decrypt full ciphertext with recovered key
    const decBytes = bytes.map((b, i) => b ^ keyBytes[i % keyLen]);
    let decrypted = "";
    try { decrypted = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(decBytes)); }
    catch { decrypted = new TextDecoder("latin1").decode(Uint8Array.from(decBytes)); }

    results.push({
      keyLen,
      editDistScore: klScore.toFixed(4),
      keyHex,
      keyStr,
      decrypted,
      textScore: scoreText(decrypted),
    });
  }

  // Sort by text score (how English-like the result is)
  results.sort((a, b) => b.textScore - a.textScore);
  return { results, bytes: bytes.length };
}

// ─── Crib Drag ────────────────────────────────────────────────────────────────

// XOR two hex strings together (for two-time pad analysis)
export function xorHexStrings(hex1, hex2) {
  const b1 = hex1.replace(/\s/g, "");
  const b2 = hex2.replace(/\s/g, "");
  if (!b1.match(/^[0-9a-fA-F]+$/) || !b2.match(/^[0-9a-fA-F]+$/))
    return { error: "Both inputs must be valid hex." };
  const len = Math.min(b1.length, b2.length);
  const result = [];
  for (let i = 0; i < len - 1; i += 2) {
    result.push((parseInt(b1.slice(i, i+2), 16) ^ parseInt(b2.slice(i, i+2), 16))
      .toString(16).padStart(2, "0"));
  }
  return { hex: result.join(" "), ascii: hexToAsciiRaw(result.join("")) };
}

function hexToAsciiRaw(hex) {
  return hex.match(/.{2}/g)?.map(b => {
    const code = parseInt(b, 16);
    return code >= 32 && code < 127 ? String.fromCharCode(code) : ".";
  }).join("") ?? "";
}

// Slide a crib (known word) over XOR'd hex to find offsets where it makes sense
export function cribDrag(xorHex, crib) {
  const bytes = xorHex.replace(/\s/g, "").match(/.{2}/g)?.map(h => parseInt(h, 16)) ?? [];
  const cribBytes = Array.from(crib).map(c => c.charCodeAt(0));
  if (!bytes.length || !cribBytes.length) return [];

  const results = [];

  for (let offset = 0; offset <= bytes.length - cribBytes.length; offset++) {
    // XOR the crib against the ciphertext to get the key fragment at this offset
    const keyFragBytes = cribBytes.map((cb, i) => bytes[offset + i] ^ cb);
    const keyFragment  = keyFragBytes.map(b =>
      b >= 32 && b < 127 ? String.fromCharCode(b) : `\\x${b.toString(16).padStart(2,"0")}`
    ).join("");
    const keyFragHex   = keyFragBytes.map(b => b.toString(16).padStart(2,"0")).join(" ");

    // Check if the key fragment looks like printable text (good key candidate)
    const keyPrintable = keyFragBytes.filter(b => b >= 32 && b < 127).length / keyFragBytes.length;

    // Use the key fragment to decrypt a wider window around the offset
    const windowStart = Math.max(0, offset - 4);
    const windowEnd   = Math.min(bytes.length, offset + cribBytes.length + 4);
    const keyLen      = keyFragBytes.length;
    const decodedWindow = Array.from({ length: windowEnd - windowStart }, (_, wi) => {
      const pos     = windowStart + wi;
      const keyByte = keyFragBytes[(pos - offset + keyLen) % keyLen] ?? (bytes[pos] ^ 0x20);
      const b       = bytes[pos] ^ keyByte;
      return b >= 32 && b < 127 ? String.fromCharCode(b) : ".";
    }).join("");

    const score = keyPrintable * 100;

    results.push({
      position:     offset,
      keyFragment,
      keyFragHex,
      keyPrintable: Math.round(keyPrintable * 100),
      plaintext:    decodedWindow,
      score,
      isPrintable:  keyPrintable > 0.8,
    });
  }

  // Sort: printable key fragments first (most likely valid positions)
  return results.sort((a, b) => b.score - a.score);
}
