import { modInverse } from "./numberTheory.js";

// ─── Affine Cipher ────────────────────────────────────────────────────────────
// c = (a*m + b) mod 26, requires gcd(a,26) = 1
// Valid a values: 1,3,5,7,9,11,15,17,19,21,23,25

export const VALID_A = [1,3,5,7,9,11,15,17,19,21,23,25];

export function affineEnc(text, a, b) {
  a = Number(a); b = ((Number(b) % 26) + 26) % 26;
  if (!VALID_A.includes(a)) return `Invalid a=${a}. Must be coprime with 26.`;
  return text.split("").map(c => {
    if (/[a-z]/.test(c)) return String.fromCharCode(((a * (c.charCodeAt(0) - 97) + b) % 26) + 97);
    if (/[A-Z]/.test(c)) return String.fromCharCode(((a * (c.charCodeAt(0) - 65) + b) % 26) + 65);
    return c;
  }).join("");
}

export function affineDec(text, a, b) {
  a = Number(a); b = ((Number(b) % 26) + 26) % 26;
  if (!VALID_A.includes(a)) return `Invalid a=${a}. Must be coprime with 26.`;
  const aInv = Number(modInverse(BigInt(a), 26n));
  return text.split("").map(c => {
    if (/[a-z]/.test(c)) return String.fromCharCode(((aInv * (c.charCodeAt(0) - 97 - b + 26)) % 26 + 26) % 26 + 97);
    if (/[A-Z]/.test(c)) return String.fromCharCode(((aInv * (c.charCodeAt(0) - 65 - b + 26)) % 26 + 26) % 26 + 65);
    return c;
  }).join("");
}

export function bfAffine(text) {
  const results = [];
  for (const a of VALID_A) {
    for (let b = 0; b < 26; b++) {
      const dec = affineDec(text, a, b);
      if (typeof dec !== "string" || dec.startsWith("Invalid")) continue;
      const common = ["the","and","is","in","to","of","flag"].reduce((s,w) => s + (dec.toLowerCase().includes(w)?1:0), 0);
      results.push({ a, b, text: dec, score: common });
    }
  }
  return results.sort((a,b) => b.score - a.score);
}

// ─── Beaufort Cipher ──────────────────────────────────────────────────────────
// c = (key - plain + 26) mod 26   (symmetric — same op for enc/dec)

export function beaufort(text, key) {
  const k = key.toUpperCase().replace(/[^A-Z]/g, "");
  if (!k) return text;
  let ki = 0;
  return text.split("").map(c => {
    if (/[a-z]/.test(c)) {
      const r = String.fromCharCode(((k.charCodeAt(ki % k.length) - 65 - (c.charCodeAt(0) - 97) + 26) % 26) + 97);
      ki++; return r;
    }
    if (/[A-Z]/.test(c)) {
      const r = String.fromCharCode(((k.charCodeAt(ki % k.length) - 65 - (c.charCodeAt(0) - 65) + 26) % 26) + 65);
      ki++; return r;
    }
    return c;
  }).join("");
}

// ─── Bacon's Cipher ───────────────────────────────────────────────────────────
// Each letter → 5 A/B symbols. Two variants: 24-letter (I=J, U=V) and 26-letter

const BACON_26 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((ch, i) =>
  i.toString(2).padStart(5, "0").replace(/0/g, "A").replace(/1/g, "B")
);
const BACON_MAP_26 = Object.fromEntries("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((ch,i)=>[ch, BACON_26[i]]));
const BACON_REV_26 = Object.fromEntries(BACON_26.map((code, i) => [code, "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i]]));

export function baconEnc(text, variant = "26") {
  return text.toUpperCase().split("").map(c => {
    if (BACON_MAP_26[c]) return BACON_MAP_26[c];
    if (c === " ") return " / ";
    return c;
  }).join(" ");
}

export function baconDec(text, variant = "26") {
  // Normalize: convert 0/1 to A/B, support both
  const normalized = text.toUpperCase()
    .replace(/0/g, "A").replace(/1/g, "B")
    .replace(/[^AB /]/g, "");
  const words = normalized.split(/\s*\/\s*/);
  return words.map(word => {
    const groups = word.trim().match(/[AB]{5}/g) || [];
    return groups.map(g => BACON_REV_26[g] || "?").join("");
  }).join(" ");
}

// ─── Playfair Cipher ──────────────────────────────────────────────────────────

function buildPlayfairSquare(key) {
  const seen = new Set();
  const square = [];
  const normalized = (key.toUpperCase() + "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    .replace(/J/g, "I").replace(/[^A-Z]/g, "");
  for (const ch of normalized) {
    if (!seen.has(ch)) { seen.add(ch); square.push(ch); }
  }
  return square; // 25 chars, 5×5 grid
}

function playfairPos(square, ch) {
  const idx = square.indexOf(ch === "J" ? "I" : ch);
  return { row: Math.floor(idx / 5), col: idx % 5 };
}

export function playfairGrid(key) {
  return buildPlayfairSquare(key);
}

export function playfairEnc(text, key) {
  const square = buildPlayfairSquare(key);
  // Prepare digraphs
  const upper = text.toUpperCase().replace(/J/g, "I").replace(/[^A-Z]/g, "");
  const pairs = [];
  let i = 0;
  while (i < upper.length) {
    const a = upper[i];
    let b = upper[i + 1] || "X";
    if (a === b) { b = "X"; i++; } else i += 2;
    pairs.push([a, b]);
  }
  if (pairs.length && pairs[pairs.length-1][1] === "X" && pairs[pairs.length-1][0] === "X") {
    pairs[pairs.length-1][1] = "Z";
  }

  return pairs.map(([a, b]) => {
    const pa = playfairPos(square, a);
    const pb = playfairPos(square, b);
    if (pa.row === pb.row) {
      return square[pa.row * 5 + (pa.col + 1) % 5] + square[pb.row * 5 + (pb.col + 1) % 5];
    } else if (pa.col === pb.col) {
      return square[((pa.row + 1) % 5) * 5 + pa.col] + square[((pb.row + 1) % 5) * 5 + pb.col];
    } else {
      return square[pa.row * 5 + pb.col] + square[pb.row * 5 + pa.col];
    }
  }).join("");
}

export function playfairDec(text, key) {
  const square = buildPlayfairSquare(key);
  const upper = text.toUpperCase().replace(/[^A-Z]/g, "");
  const pairs = upper.match(/.{2}/g) || [];
  return pairs.map(([a, b]) => {
    const pa = playfairPos(square, a);
    const pb = playfairPos(square, b);
    if (pa.row === pb.row) {
      return square[pa.row * 5 + (pa.col + 4) % 5] + square[pb.row * 5 + (pb.col + 4) % 5];
    } else if (pa.col === pb.col) {
      return square[((pa.row + 4) % 5) * 5 + pa.col] + square[((pb.row + 4) % 5) * 5 + pb.col];
    } else {
      return square[pa.row * 5 + pb.col] + square[pb.row * 5 + pa.col];
    }
  }).join("").replace(/X$/, "");
}
