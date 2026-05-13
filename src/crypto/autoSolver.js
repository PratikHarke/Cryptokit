/**
 * CryptKit Auto-Solver v5
 * Layered cascade detection — 30+ algorithms
 * Handles: B64, Hex, Binary, Base32, Base58, Morse, URL, HTML, Unicode,
 *          Caesar, ROT-13, ROT-47, Atbash, Bacon, Vigenère, Substitution,
 *          XOR, JWT, RSA/PEM, Zlib, Gzip, Flag-wrapper, Hash ID
 */

import { scoreText, ic, bfCaesar } from "./analysis.js";
import { b64Dec }           from "./base64.js";
import { hexToAscii }       from "./converters.js";
import { morseDec }         from "./morse.js";
import { crackVigenere }    from "./vigenereAttack.js";
import { atbash }           from "./atbash.js";
import { rot13 }            from "./caesar.js";
import { shannonEntropy }   from "./entropy.js";

// ═══════════════════════════════════════════════════════════════
// 1. FORMAT DETECTORS
// ═══════════════════════════════════════════════════════════════

const printableRatio = s => {
  const c = s.replace(/\s/g, "");
  return !c.length ? 0 : c.split("").filter(x => x.charCodeAt(0) >= 32 && x.charCodeAt(0) < 127).length / c.length;
};
const containsFlag = s => /flag\{[^}]+\}/i.test(s) || /ctf\{[^}]+\}/i.test(s) || /[a-z_]{2,20}\{[^}]+\}/i.test(s);

const isBase64 = s => { const t = s.trim(); return /^[A-Za-z0-9+/]+=*$/.test(t) && t.length % 4 === 0 && t.length >= 4; };
const isBase64URL = s => { const t = s.trim(); return /^[A-Za-z0-9\-_]+=*$/.test(t) && t.length >= 4 && !isBase64(t); };
const isBase32 = s => { const t = s.trim(); return /^[A-Z2-7]+=*$/i.test(t) && t.length % 8 === 0 && t.length >= 8; };
const isHex = s => { const t = s.replace(/[\s:]/g, ""); return /^[0-9a-fA-F]+$/.test(t) && t.length % 2 === 0 && t.length >= 2; };
const isBinary = s => { const t = s.replace(/\s/g, ""); return /^[01]+$/.test(t) && t.length % 8 === 0 && t.length >= 8; };
const isMorse = s => /^[.\-\/ ]+$/.test(s.trim()) && s.includes(".") && s.includes("-") && s.trim().length >= 2;
const isDecBytes = s => { const p = s.trim().split(/[\s,]+/); return p.length >= 3 && p.every(x => /^\d+$/.test(x) && +x <= 255); };
const isOctalBytes = s => { const p = s.trim().split(/\s+/); return p.length >= 3 && p.every(x => /^0[0-7]+$/.test(x) || /^[0-7]{3}$/.test(x)); };
const isURLEncoded = s => /%[0-9a-fA-F]{2}/.test(s);
const isHTMLEntity = s => /&[a-z#][a-z0-9]{1,8};/i.test(s);
const isUnicodeEsc = s => /\\u[0-9a-fA-F]{4}/.test(s) || /%u[0-9a-fA-F]{4}/.test(s);
const isJWT = s => { const p = s.trim().split("."); return p.length === 3 && p.every(x => /^[A-Za-z0-9+/=_-]+$/.test(x) && x.length > 0); };
const isPEM = s => s.includes("-----BEGIN");
const isRSAParams = s => /n\s*=\s*\d{20,}/.test(s) || (/\d{50,}/.test(s) && /e\s*=\s*\d/.test(s));

const isBase58 = s => {
  const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const t = s.trim();
  return t.length >= 6 && t.split("").every(c => A.includes(c)) && !isHex(t) && !isBase64(t);
};
const isAlpha = s => s.replace(/[^a-zA-Z]/g, "").length / Math.max(s.replace(/[\s_\-]/g, "").length, 1) > 0.5;
const isROT47 = s => /^[!-~\s]+$/.test(s) && s.length >= 4;

// Bacon: 2 unique alpha letters, length divisible by 5
const isBacon = s => {
  const a = s.toUpperCase().replace(/[^A-Z]/g, "");
  return new Set(a.split("")).size === 2 && a.length >= 10 && a.length % 5 === 0;
};

// CTF flag wrapper: PREFIX{...}
const extractFlagWrapper = s => {
  const m = s.match(/^([A-Za-z0-9_]{0,30})\{([^}]{4,})\}$/);
  return m ? { prefix: m[1], inner: m[2] } : null;
};

// ═══════════════════════════════════════════════════════════════
// 2. DECODE HELPERS
// ═══════════════════════════════════════════════════════════════

const tryBase64 = s => {
  try {
    const r = b64Dec(s.trim());
    return r && !r.startsWith("Invalid") && !r.startsWith("Encoding error") ? r : null;
  } catch { return null; }
};

const b64ToBytes = s => {
  try {
    const clean = s.trim().replace(/-/g, "+").replace(/_/g, "/");
    const mod = clean.length % 4;
    const padded = mod ? clean + "====".slice(mod) : clean;
    const bin = atob(padded);
    return new Uint8Array(bin.length).map((_, i) => bin.charCodeAt(i));
  } catch { return null; }
};

async function tryZlib(bytes) {
  if (!bytes || bytes.length < 3 || bytes[0] !== 0x78) return null;
  if (![0x01, 0x5E, 0x9C, 0xDA, 0xF9].includes(bytes[1])) return null;
  for (const mode of ["deflate", "deflate-raw"]) {
    try {
      const ds = new DecompressionStream(mode);
      const w = ds.writable.getWriter();
      w.write(mode === "deflate" ? bytes : bytes.slice(2)); w.close();
      const buf = await new Response(ds.readable).arrayBuffer();
      return new TextDecoder("utf-8", { fatal: false }).decode(buf);
    } catch {}
  }
  return null;
}

async function tryGzip(bytes) {
  if (!bytes || bytes[0] !== 0x1F || bytes[1] !== 0x8B) return null;
  try {
    const ds = new DecompressionStream("gzip");
    const w = ds.writable.getWriter();
    w.write(bytes); w.close();
    const buf = await new Response(ds.readable).arrayBuffer();
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  } catch { return null; }
}

const tryHex = s => { try { const r = hexToAscii(s.replace(/\s/g, "")); return r?.startsWith("Invalid") ? null : r; } catch { return null; } };
const tryMorse = s => {
  try {
    const r = morseDec(s);
    if (!r) return null;
    // Only discard if the entire output is "?" — partial decodes with some unknowns are fine
    const nonQ = r.replace(/[? ]/g, "");
    return nonQ.length === 0 ? null : r;
  } catch { return null; }
};

const tryBinary = s => {
  const c = s.replace(/\s/g, "");
  if (c.length % 8 !== 0) return null;
  try { return String.fromCharCode(...c.match(/.{8}/g).map(b => parseInt(b, 2))); } catch { return null; }
};

const tryBase32 = s => {
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const t = s.trim().toUpperCase().replace(/=+$/, "");
  let bits = "", out = "";
  for (const c of t) { const i = ALPHA.indexOf(c); if (i < 0) return null; bits += i.toString(2).padStart(5, "0"); }
  for (let i = 0; i + 8 <= bits.length; i += 8) out += String.fromCharCode(parseInt(bits.slice(i, i + 8), 2));
  return out || null;
};

const tryBase58 = s => {
  const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  try {
    let n = BigInt(0);
    for (const c of s.trim()) { const i = A.indexOf(c); if (i < 0) return null; n = n * 58n + BigInt(i); }
    const bytes = [];
    while (n > 0n) { bytes.unshift(Number(n & 255n)); n >>= 8n; }
    let lead = 0; for (const c of s.trim()) { if (c !== "1") break; lead++; }
    const result = new Uint8Array([...Array(lead).fill(0), ...bytes]);
    return new TextDecoder("utf-8", { fatal: true }).decode(result);
  } catch { return null; }
};

const tryROT47 = s => s.replace(/[!-~]/g, c => String.fromCharCode(((c.charCodeAt(0) - 33 + 47) % 94) + 33));
const tryReverse = s => s.split("").reverse().join("");
const tryURLDec = s => { try { return decodeURIComponent(s); } catch { return null; } };
const tryHTMLDec = s => {
  try {
    const doc = new DOMParser().parseFromString(
      `<!DOCTYPE html><body>${s}</body>`, "text/html"
    );
    const out = doc.body.textContent;
    return out !== s ? out : null;
  } catch { return null; }
};
const tryUniDec = s => s.replace(/\\u([0-9a-fA-F]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
                        .replace(/%u([0-9a-fA-F]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
const tryDecBytes = s => { try { return String.fromCharCode(...s.trim().split(/[\s,]+/).map(Number)); } catch { return null; } };
const tryOctalBytes = s => { try { return String.fromCharCode(...s.trim().split(/\s+/).map(o => parseInt(o, 8))); } catch { return null; } };

// ═══════════════════════════════════════════════════════════════
// 3. HASH IDENTIFICATION  (false-positive guarded)
// ═══════════════════════════════════════════════════════════════

function isLikelyHash(s) {
  const c = s.toLowerCase();
  if (new Set(c.split("")).size <= 3) return false;       // "aaaa..." not a real hash
  return (new Set(c.split("")).size / Math.min(c.length, 16)) > 0.25;
}

function detectHashHint(clean) {
  const pfx = [["$2","bcrypt"],["$argon2","Argon2"],["$6$","SHA-512crypt"],["$5$","SHA-256crypt"],
               ["$1$","MD5crypt"],["$P$","PHPass/WordPress"],["$H$","phpBB PHPass"],
               ["$S$","Drupal SHA-512"],["sha256$","Django SHA-256"],["pbkdf2","PBKDF2"]];
  for (const [p, t] of pfx) if (clean.startsWith(p)) return `${t} — use Hash Cracker`;

  if (/^[a-f0-9]+$/i.test(clean) && isLikelyHash(clean)) {
    const map = { 8:"CRC-32", 32:"MD5", 40:"SHA-1", 56:"SHA-224", 64:"SHA-256", 96:"SHA-384", 128:"SHA-512" };
    if (map[clean.length]) return `${map[clean.length]} hash — ${clean.length} hex chars`;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// 4. RSA / PEM analysis
// ═══════════════════════════════════════════════════════════════

function analyzeRSA(t) {
  const out = [];
  if (isPEM(t)) {
    const type = t.includes("PRIVATE KEY") ? "RSA Private Key (PEM) ⚠️ SENSITIVE"
      : t.includes("PUBLIC KEY") ? "RSA Public Key (PEM)"
      : t.includes("CERTIFICATE") ? "X.509 Certificate (PEM)"
      : "PEM Block";
    out.push({ category:"RSA/PKI", method: type, output: t.slice(0, 280) + (t.length > 280 ? "…" : ""), confidence:96, tool:"rsa", note:"Use RSA Attacks for key analysis" });
    return out;
  }
  const nm = t.match(/n\s*=\s*(\d+)/), em = t.match(/e\s*=\s*(\d+)/), cm = t.match(/c\s*=\s*(\d+)/);
  if (nm && em) {
    const bits = BigInt(nm[1]).toString(2).length;
    out.push({ category:"RSA/PKI", method:`RSA Params (${bits}-bit n)`,
      output: `n = ${nm[1].slice(0,50)}…\ne = ${em[1]}${cm ? `\nc = ${cm[1].slice(0,50)}…` : ""}`,
      confidence:92, tool:"rsa",
      note:`${bits} bits — ${bits < 512 ? "⚠️ WEAK! factorize with yafu/msieve" : bits < 1024 ? "Weak" : "Acceptable"} Try Wiener/Fermat` });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════
// 5.  RECURSIVE DECODE HELPER (chain decoding up to maxDepth)
// ═══════════════════════════════════════════════════════════════

async function tryDecode(text, depth = 0, maxDepth = 3) {
  if (depth >= maxDepth || !text) return null;
  const t = text.trim();

  if (isBase64(t)) { const d = tryBase64(t); if (d && printableRatio(d) > 0.6) return { method:"Base64", text:d, depth:depth+1 }; }
  if (isHex(t.replace(/[\s:]/g, ""))) { const d = tryHex(t); if (d && printableRatio(d) > 0.5) return { method:"Hex", text:d, depth:depth+1 }; }
  if (isBinary(t)) { const d = tryBinary(t); if (d && printableRatio(d) > 0.5) return { method:"Binary", text:d, depth:depth+1 }; }
  if (isBase32(t)) { const d = tryBase32(t); if (d && printableRatio(d) > 0.5) return { method:"Base32", text:d, depth:depth+1 }; }
  if (isURLEncoded(t)) { const d = tryURLDec(t); if (d && d !== t && printableRatio(d) > 0.5) return { method:"URL-decode", text:d, depth:depth+1 }; }

  const r13 = rot13(t); if (scoreText(r13) > 15) return { method:"ROT-13", text:r13, depth:depth+1 };

  const bytes = b64ToBytes(t);
  if (bytes) {
    const z = await tryZlib(bytes); if (z) return { method:"Zlib", text:z, depth:depth+1 };
    const g = await tryGzip(bytes); if (g) return { method:"Gzip", text:g, depth:depth+1 };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// 6.  MAIN CASCADE
// ═══════════════════════════════════════════════════════════════

export async function autoSolve(input) {
  const results = [];
  const seen = new Set();

  function add(category, method, output, confidence, tool = "pipeline", note = "", layers = 0) {
    if (!output) return;
    const key = `${method}|${String(output).slice(0, 40)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const flagBonus = containsFlag(String(output)) ? 50 : 0;
    results.push({
      category, method, output: String(output),
      confidence: Math.min(99, confidence + flagBonus),
      englishScore: scoreText(String(output)),
      tool, note,
      hasFlag: containsFlag(String(output)),
      layers,
    });
  }

  const t = input.trim();
  if (!t) return [];

  // ── Plain English early-exit: if input already reads like English
  //    do NOT suggest transformations like "Reverse → Reverse"
  const plainScore = scoreText(t);
  const plainPrintable = printableRatio(t);
  if (plainPrintable > 0.92 && plainScore > 40 && !containsFlag(t) &&
      !isBase64(t) && !isHex(t) && !isBinary(t) && !isMorse(t) && !isJWT(t) &&
      !isPEM(t) && !isURLEncoded(t) && !isBase32(t)) {
    add("Info", "Plain text (no encoding detected)", t, Math.min(85, Math.round(plainPrintable * 60 + 20)),
      "pipeline", "Input appears to already be readable text — no decoding needed.");
    return sort(results);
  }

  // ── RSA / PEM (early exit) ────────────────────────────────────────────
  if (isPEM(t) || isRSAParams(t)) {
    analyzeRSA(t).forEach(r => add(r.category, r.method, r.output, r.confidence, r.tool, r.note));
    if (isPEM(t)) return sort(results);
  }

  // ── JWT (early exit) ──────────────────────────────────────────────────
  if (isJWT(t)) {
    const parts = t.split(".");
    try {
      const hdr = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
      const pay = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      const sig = parts[2];
      const alg = hdr.alg || "none";
      add("Web Crypto", "JWT Token",
        JSON.stringify({ header: hdr, payload: pay }, null, 2),
        96, "jwt",
        `alg=${alg}${!sig ? " ⚠️ No signature — alg:none attack!" : sig.length < 10 ? " ⚠️ Weak/empty sig!" : ""}`);
    } catch {
      add("Web Crypto", "JWT (parse error)", parts.map(p => { try { return atob(p.replace(/-/g,"+").replace(/_/g,"/")); } catch { return p; } }).join("\n"), 60, "jwt");
    }
    return sort(results);
  }

  // ── CTF Flag wrapper: PREFIX{encoded_inner} ───────────────────────────
  const fw = extractFlagWrapper(t);
  if (fw) {
    const { prefix, inner } = fw;
    let decoded = null; let decMethod = "";

    if (isBase64(inner))   { const d = tryBase64(inner); if (d) { decoded = d; decMethod = "Base64"; } }
    if (!decoded && isHex(inner)) { const d = tryHex(inner); if (d) { decoded = d; decMethod = "Hex"; } }
    if (!decoded && isBinary(inner)) { const d = tryBinary(inner); if (d) { decoded = d; decMethod = "Binary"; } }
    if (!decoded) {
      const pad = inner.replace(/-/g, "+").replace(/_/g, "/") + "====".slice(inner.length % 4 || 4);
      const d = tryBase64(pad); if (d) { decoded = d; decMethod = "Base64URL"; }
    }
    if (!decoded) {
      const bytes = b64ToBytes(inner + "==");
      const z = bytes && await tryZlib(bytes); if (z) { decoded = z; decMethod = "Base64+Zlib"; }
    }
    if (!decoded) { const r13 = rot13(inner); if (scoreText(r13) > 15) { decoded = r13; decMethod = "ROT-13"; } }

    if (decoded && printableRatio(decoded) > 0.5) {
      add("CTF Pattern", `${prefix || "flag"}{${decMethod} inner}`,
        `${prefix}{${decoded}}`, 90, "pipeline", `Inner decoded via ${decMethod}`, 2);
      // Recurse into decoded inner
      const next = await tryDecode(decoded, 1);
      if (next) add("CTF Pattern", `${prefix}{${decMethod} → ${next.method}}`,
        `${prefix}{${next.text}}`, 82, "pipeline", `${decMethod} then ${next.method}`, next.depth + 1);
    } else {
      const innerType = isBase64(inner) ? "Base64" : isHex(inner) ? "Hex" : isBinary(inner) ? "Binary" : "unknown";
      add("CTF Pattern", `Flag wrapper ${prefix || "flag"}{…}`,
        `Prefix: ${prefix}\nInner (${innerType}): ${inner}\n\n→ Paste the inner part alone into Auto-Solver.`,
        70, "autosolver", `Inner type: ${innerType}`);
    }
  }

  // ── Morse ─────────────────────────────────────────────────────────────
  if (isMorse(t)) {
    const d = tryMorse(t);
    if (d) add("Encoding", "Morse Code → ASCII", d, 92, "morse");
    return sort(results);
  }

  // ── Binary ────────────────────────────────────────────────────────────
  if (isBinary(t)) {
    const d = tryBinary(t);
    if (d) {
      add("Encoding", "Binary → ASCII", d, 92, "converter", `${t.replace(/\s/g,"").length / 8} chars`);
      const next = await tryDecode(d, 1);
      if (next) add("Encoding", `Binary → ${next.method} → ASCII`, next.text, 82, "pipeline", "", next.depth + 1);
      const r13d = rot13(d); if (scoreText(r13d) > 18) add("Encoding", "Binary → ROT-13", r13d, 72, "pipeline", "", 2);
    }
    return sort(results);
  }

  // ── URL-encoded ───────────────────────────────────────────────────────
  if (isURLEncoded(t)) {
    const d = tryURLDec(t);
    if (d && d !== t) {
      add("Encoding", "URL Decode (%XX)", d, 88, "modernenc", "Percent-encoding");
      const next = await tryDecode(d, 1);
      if (next) add("Encoding", `URL → ${next.method}`, next.text, 76, "pipeline", "", next.depth + 1);
    }
  }

  // ── HTML entities ─────────────────────────────────────────────────────
  if (isHTMLEntity(t)) {
    const d = tryHTMLDec(t);
    if (d && d !== t) add("Encoding", "HTML Entity Decode", d, 86, "modernenc");
  }

  // ── Unicode escapes ───────────────────────────────────────────────────
  if (isUnicodeEsc(t)) {
    const d = tryUniDec(t);
    if (d && d !== t) add("Encoding", "Unicode Escape (\\uXXXX)", d, 88, "modernenc");
  }

  // ── Decimal bytes ─────────────────────────────────────────────────────
  if (isDecBytes(t)) {
    const d = tryDecBytes(t);
    if (d && printableRatio(d) > 0.7) add("Encoding", "Decimal Bytes → ASCII", d, 82, "converter");
  }

  // ── Octal bytes ───────────────────────────────────────────────────────
  if (isOctalBytes(t)) {
    const d = tryOctalBytes(t);
    if (d && printableRatio(d) > 0.7) add("Encoding", "Octal Bytes → ASCII", d, 78, "converter");
  }

  // ── Base32 ────────────────────────────────────────────────────────────
  if (isBase32(t)) {
    const d = tryBase32(t);
    if (d && printableRatio(d) > 0.5) add("Encoding", "Base32 → ASCII", d, 88, "modernenc", "Common in TOTP/2FA/CTF");
  }

  // ── Base58 ────────────────────────────────────────────────────────────
  if (isBase58(t)) {
    const d = tryBase58(t);
    if (d && printableRatio(d) > 0.6) add("Encoding", "Base58 → ASCII", d, 74, "pipeline", "Bitcoin/IPFS encoding");
  }

  // ── Hex ───────────────────────────────────────────────────────────────
  if (isHex(t.replace(/[\s:]/g, ""))) {
    const clean = t.replace(/[\s:]/g, "");

    // Hash detection (before ASCII conversion)
    const hashHint = detectHashHint(clean);
    if (hashHint) {
      add("Hash", `Hash: ${clean.length} hex chars`, hashHint, 76, "hashid", hashHint);
    }

    const ascii = tryHex(clean);
    if (ascii) {
      const pr = printableRatio(ascii);
      add("Encoding", "Hex → ASCII", ascii, Math.round(58 + pr * 34), "converter", `${clean.length / 2} bytes`);

      // XOR brute-force single byte first
      const hexBytes = clean.match(/.{2}/g).map(h => parseInt(h, 16));
      let xorHits = 0;
      for (let k = 1; k < 256 && xorHits < 6; k++) {
        const dec = new Uint8Array(hexBytes.map(b => b ^ k));
        let txt = ""; try { txt = new TextDecoder("utf-8", { fatal: true }).decode(dec); } catch { continue; }
        if (scoreText(txt) > 25 || containsFlag(txt)) {
          add("XOR", `XOR key=0x${k.toString(16).padStart(2,"0")} "${String.fromCharCode(k)}"`, txt, 65, "bf_xor");
          xorHits++;
        }
      }
      if (xorHits === 0 && hexBytes.length >= 8) {
        add("XOR", "Single-byte XOR failed",
          `None of the 255 single-byte keys yielded readable text.\n\nNext steps:\n• XOR Cracker → repeating-key XOR (try key lengths 2-16)\n• If you know part of plaintext (e.g. "flag{"), use crib drag\n• Common CTF XOR key lengths: 4, 8, 16 bytes`,
          30, "xorcracker", "Try multi-byte XOR Cracker");
      }

      // Chain: Hex → Base64 → ...
      if (isBase64(ascii.trim())) {
        const b2 = tryBase64(ascii.trim());
        if (b2) {
          add("Encoding", "Hex → Base64 → ASCII", b2, 72, "pipeline", "", 2);
          const bytes2 = b64ToBytes(ascii.trim());
          const z2 = bytes2 && await tryZlib(bytes2);
          if (z2) add("Encoding", "Hex → Base64 → Zlib → ASCII", z2, 82, "pipeline", "", 3);
        }
      }

      // Reversed hex decode
      const rev = tryReverse(ascii);
      if (rev !== ascii && (scoreText(rev) > 20 || containsFlag(rev)))
        add("Encoding", "Hex → ASCII (reversed)", rev, 56, "converter", "Text stored reversed");
    }

    return sort(results);
  }

  // ── Base64 + compression ──────────────────────────────────────────────
  if (isBase64(t)) {
    const bytes = b64ToBytes(t);

    // Compression wins over ASCII — must check FIRST
    if (bytes) {
      const z = await tryZlib(bytes);
      if (z) {
        add("Encoding", "Base64 → Zlib → ASCII", z, 95, "pipeline",
          "Zlib/deflate compressed (Python CTF common)", 2);
        const next = await tryDecode(z, 1, 2);
        if (next) add("Encoding", `Base64 → Zlib → ${next.method}`, next.text, 84, "pipeline", "", next.depth + 2);
      }
      const g = await tryGzip(bytes);
      if (g) add("Encoding", "Base64 → Gzip → ASCII", g, 93, "pipeline", "Gzip compressed payload", 2);
    }

    const d = tryBase64(t);
    if (d) {
      add("Encoding", "Base64 → ASCII", d, 87, "base64");

      // Nested Base64 chains (up to ×3)
      let prev = d;
      for (let i = 2; i <= 3; i++) {
        const next = prev.trim();
        if (!isBase64(next)) break;
        const dd = tryBase64(next);
        if (!dd) break;
        add("Encoding", `Base64×${i} → ASCII`, dd, 88 - i * 6, "pipeline", `${i}× base64 encoded`, i);
        prev = dd;
      }

      // B64 → Hex → ASCII
      if (isHex(d.replace(/\s/g, ""))) {
        const h = tryHex(d);
        if (h) add("Encoding", "Base64 → Hex → ASCII", h, 70, "pipeline", "", 2);
      }

      // B64 → Morse
      if (isMorse(d)) { const m = tryMorse(d); if (m) add("Encoding", "Base64 → Morse → ASCII", m, 72, "pipeline", "", 2); }

      // B64 → URL
      if (isURLEncoded(d)) { const u = tryURLDec(d); if (u && u !== d) add("Encoding", "Base64 → URL Decode", u, 68, "pipeline", "", 2); }

      // B64 → ROT-13
      const r13d = rot13(d);
      if (scoreText(r13d) > 18) add("Encoding", "Base64 → ROT-13", r13d, 66, "pipeline", "", 2);
    }
  }

  // ── Base64URL ─────────────────────────────────────────────────────────
  if (isBase64URL(t)) {
    const pad = t.replace(/-/g, "+").replace(/_/g, "/") + "====".slice(t.length % 4 || 4);
    const d = tryBase64(pad);
    if (d && printableRatio(d) > 0.6) add("Encoding", "Base64URL → ASCII", d, 78, "base64", "URL-safe base64");
  }

  // ── Classical cipher detection ────────────────────────────────────────
  if (isAlpha(t) && t.replace(/[^a-zA-Z]/g, "").length >= 4) {
    const inputIC = parseFloat(ic(t));

    // Atbash
    const ab = atbash(t);
    if (scoreText(ab) > 16) add("Classical", "Atbash", ab, 58, "atbash");

    // ROT-13 (lowered threshold — works on short/underscore strings like "uryyb_jbeyg")
    const r13 = rot13(t);
    const r13s = scoreText(r13);
    if (r13s > 10 || containsFlag(r13))
      add("Classical", "ROT-13", r13, 74, "rot13", `English score: ${Math.round(r13s)}`);

    // ROT-47
    if (isROT47(t)) {
      const r47 = tryROT47(t);
      if (scoreText(r47) > 10 || containsFlag(r47)) add("Classical", "ROT-47", r47, 56, "rot13", "Shifts all printable ASCII by 47");
    }

    // Reversed string
    const rev = tryReverse(t);
    if (rev !== t && (scoreText(rev) > 16 || containsFlag(rev)))
      add("Classical", "Reversed String", rev, 60, "converter", "Text stored in reverse order");

    // Caesar brute-force (all 26)
    const bfRes = bfCaesar(t).slice(0, 6);
    for (const r of bfRes) {
      if (r.score > 14)
        add("Classical", `Caesar shift-${r.shift}`, r.text, Math.min(92, 30 + Math.round(r.score * 0.6)), "bf_caesar", `score=${Math.round(r.score)}`);
    }

    // Vigenère — needs IC < 0.054 AND long text
    if (inputIC < 0.054 && t.replace(/[^a-zA-Z]/g, "").length >= 50) {
      try {
        const vr = crackVigenere(t);
        if (vr?.results?.length > 0 && scoreText(vr.results[0].decrypted) > 14)
          add("Classical", `Vigenère key="${vr.results[0].key}"`, vr.results[0].decrypted, 66, "vigcrack",
            `keylen=${vr.results[0].keyLen} · IC=${inputIC.toFixed(4)}`);
      } catch {}
    }

    // Monoalphabetic substitution hint (high IC, bad English score)
    if (inputIC > 0.058 && scoreText(t) < 12 && t.replace(/[^a-zA-Z]/g, "").length >= 20)
      add("Classical", "Substitution Cipher",
        `IC=${inputIC.toFixed(4)} — high IC (monoalphabetic pattern).\nLetter frequencies consistent with substitution cipher.\n\n→ Use Substitution Solver to map by frequency analysis.`,
        44, "substitution", `IC=${inputIC.toFixed(4)}`);

    // Bacon cipher detection
    if (isBacon(t)) {
      const alpha = t.toUpperCase().replace(/[^A-Z]/g, "");
      const [a, b] = [...new Set(alpha.split(""))];
      const decoded = alpha.match(/.{5}/g)
        .map(chunk => {
          const idx = chunk.split("").reduce((acc, c) => (acc << 1) | (c === b ? 1 : 0), 0);
          return idx < 26 ? String.fromCharCode(65 + idx) : "?";
        }).join("");
      add("Classical", "Bacon Cipher",
        `Decoded: ${decoded}\n\n(Using ${a}=0, ${b}=1 mapping)\nIf wrong, swap A↔B: try ${b}=0, ${a}=1`,
        78, "classicalextra", `2-letter alphabet (${a}/${b}), length ÷ 5`);
    }
  }

  // ── Entropy analysis ──────────────────────────────────────────────────
  if (t.length >= 20) {
    try {
      const byteArr = Array.from(new TextEncoder().encode(t));
      const H = shannonEntropy(byteArr);
      if (H > 6.5) {
        const hashHint = detectHashHint(t.replace(/\s/g, ""));
        add("Encrypted/Compressed", "High-Entropy Blob",
          `Shannon entropy: ${H.toFixed(3)} bits/byte\n\n${hashHint ? `Hash candidate: ${hashHint}` : "Likely AES/RSA ciphertext or compressed data."}\n\nRecommended next steps:\n• Entropy Visualizer → byte frequency heatmap\n• If from an image challenge → LSB Steganography\n• If 32/40/64 hex chars → Hash Identifier\n• If binary blob → check file magic bytes (hex view)`,
          62, "entropy", `H=${H.toFixed(2)}`);
      }
    } catch {}
  }

  // ── Fallback: try Caesar/ROT47 on anything readable ───────────────────
  if (results.length === 0 && printableRatio(t) > 0.8 && t.length >= 4) {
    bfCaesar(t).slice(0, 3).forEach(r => {
      if (r.score > 8) add("Classical", `Caesar shift-${r.shift} (low confidence)`, r.text, 24, "bf_caesar");
    });
    if (isROT47(t)) {
      const r47 = tryROT47(t);
      if (scoreText(r47) > 8) add("Classical", "ROT-47 (low confidence)", r47, 22, "rot13");
    }
  }

  // ── No candidates — suggest pipeline ──────────────────────────────────
  if (results.length === 0) {
    add("Info", "No single-step encoding detected",
      `No known encoding/cipher identified.\n\nCommon layered CTF patterns to try manually in Pipeline:\n  Base64 → ROT-13 → Base64\n  Hex → XOR(key) → Base64\n  Reversed → Base64 → Hex\n  Zlib → Base64\n\nTools to try next:\n  Pipeline      — chain transforms manually\n  XOR Cracker   — repeating-key XOR\n  Hash ID       — if it looks like a hash\n  LSB Stego     — if from an image challenge\n  Substitution  — if single-substitution cipher`,
      10, "pipeline", "Try Pipeline for layered decoding");
  }

  return sort(results);
}

const sort = r =>
  r.sort((a, b) =>
    // Primary: confidence descending
    (b.confidence - a.confidence) ||
    // Secondary: English score descending
    (b.englishScore - a.englishScore) ||
    // Tertiary: label alphabetical — ensures identical results on every call
    (a.label ?? "").localeCompare(b.label ?? "")
  ).slice(0, 18);
