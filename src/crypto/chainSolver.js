/**
 * Chain Solver Engine
 * Exhaustively tries multi-step decode sequences and scores the final plaintext.
 * Used by ChainSolverView to provide step-by-step layered decoding.
 */

import { scoreText, ic, bfCaesar } from "./analysis.js";
import { b64Dec } from "./base64.js";
import { hexToAscii } from "./converters.js";
import { morseDec } from "./morse.js";
import { atbash } from "./atbash.js";
import { rot13 } from "./caesar.js";
import { shannonEntropy } from "./entropy.js";

// ── Decoders ──────────────────────────────────────────────────────────────────
// Each returns { output, label } or null on failure

const decoders = {
  base64: {
    label: "Base64 decode",
    detect: s => /^[A-Za-z0-9+/]+=*$/.test(s.trim()) && s.trim().length % 4 === 0 && s.trim().length >= 4,
    run: s => {
      try { const r = b64Dec(s.trim()); return r && !r.startsWith("Invalid") ? r : null; }
      catch { return null; }
    },
  },
  base64url: {
    label: "Base64URL decode",
    detect: s => /^[A-Za-z0-9\-_]+=*$/.test(s.trim()) && s.trim().length >= 4,
    run: s => {
      const c = s.trim().replace(/-/g, "+").replace(/_/g, "/");
      const p = c + "====".slice(c.length % 4 || 4);
      try { const r = b64Dec(p); return r && !r.startsWith("Invalid") ? r : null; }
      catch { return null; }
    },
  },
  hex: {
    label: "Hex → ASCII",
    detect: s => /^[0-9a-fA-F\s:]+$/.test(s.trim()) && s.replace(/[\s:]/g, "").length % 2 === 0 && s.trim().length >= 4,
    run: s => {
      try {
        const r = hexToAscii(s.replace(/[\s:]/g, ""));
        return r && !r.startsWith("Invalid") ? r : null;
      } catch { return null; }
    },
  },
  binary: {
    label: "Binary → ASCII",
    detect: s => /^[01\s]+$/.test(s.trim()) && s.replace(/\s/g, "").length % 8 === 0 && s.trim().length >= 8,
    run: s => {
      const c = s.replace(/\s/g, "");
      try { return String.fromCharCode(...c.match(/.{8}/g).map(b => parseInt(b, 2))); }
      catch { return null; }
    },
  },
  rot13: {
    label: "ROT-13",
    detect: s => /[a-zA-Z]/.test(s),
    run: s => rot13(s),
  },
  atbash: {
    label: "Atbash",
    detect: s => /[a-zA-Z]/.test(s),
    run: s => atbash(s),
  },
  rot47: {
    label: "ROT-47",
    detect: s => /[!-~]/.test(s),
    run: s => s.replace(/[!-~]/g, c => String.fromCharCode(((c.charCodeAt(0) - 33 + 47) % 94) + 33)),
  },
  reverse: {
    label: "Reverse string",
    detect: s => s.length >= 4,
    run: s => s.split("").reverse().join(""),
  },
  urldecode: {
    label: "URL decode",
    detect: s => /%[0-9a-fA-F]{2}/.test(s),
    run: s => { try { return decodeURIComponent(s); } catch { return null; } },
  },
  base32: {
    label: "Base32 decode",
    detect: s => /^[A-Z2-7]+=*$/i.test(s.trim()) && s.trim().length % 8 === 0,
    run: s => {
      const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
      const t = s.trim().toUpperCase().replace(/=+$/, "");
      let bits = "", out = "";
      for (const c of t) { const i = ALPHA.indexOf(c); if (i < 0) return null; bits += i.toString(2).padStart(5, "0"); }
      for (let i = 0; i + 8 <= bits.length; i += 8) out += String.fromCharCode(parseInt(bits.slice(i, i + 8), 2));
      return out || null;
    },
  },
  morse: {
    label: "Morse → ASCII",
    detect: s => /^[.\-/ ]+$/.test(s.trim()) && s.includes(".") && s.includes("-"),
    run: s => { try { const r = morseDec(s); return r && !r.includes("?") ? r : null; } catch { return null; } },
  },
  xor_brute: {
    label: "XOR brute-force (best key)",
    detect: s => /^[0-9a-fA-F\s]+$/.test(s.trim()) && s.replace(/\s/g, "").length >= 8,
    run: s => {
      const bytes = s.replace(/\s/g, "").match(/.{2}/g)?.map(h => parseInt(h, 16));
      if (!bytes) return null;
      let best = null, bestScore = 0;
      for (let k = 1; k < 256; k++) {
        const dec = bytes.map(b => String.fromCharCode(b ^ k)).join("");
        const sc = scoreText(dec);
        if (sc > bestScore) { bestScore = sc; best = { dec, k }; }
      }
      return best && bestScore > 20 ? `[key=0x${best.k.toString(16).padStart(2,"0")}] ${best.dec}` : null;
    },
  },
};

// ── Scoring ───────────────────────────────────────────────────────────────────

const printableRatio = s => {
  const c = s.replace(/\s/g, "");
  if (!c.length) return 0;
  return c.split("").filter(x => x.charCodeAt(0) >= 32 && x.charCodeAt(0) < 127).length / c.length;
};

const containsFlag = s => /flag\{[^}]+\}/i.test(s) || /ctf\{[^}]+\}/i.test(s) || /[a-z_]{2,20}\{[^}]+\}/i.test(s);

function scoreResult(text) {
  if (!text) return -1;
  const pr = printableRatio(text);
  if (pr < 0.5) return -1;
  const eng = scoreText(text);
  const flagBonus = containsFlag(text) ? 80 : 0;
  return Math.round(pr * 30 + eng * 2 + flagBonus);
}

// ── BFS chain exploration ─────────────────────────────────────────────────────
// Tries sequences of decoders up to maxDepth layers deep.
// Returns chains sorted by score descending.

export function exploreChains(input, maxDepth = 4, maxResults = 12) {
  const seen = new Set();
  const results = [];

  function explore(text, chain, depth) {
    const key = text.slice(0, 60);
    if (seen.has(key) || depth > maxDepth || !text.trim()) return;
    seen.add(key);

    if (chain.length > 0) {
      const score = scoreResult(text);
      if (score >= 0) {
        results.push({
          chain,
          output: text,
          score,
          hasFlag: containsFlag(text),
          printable: Math.round(printableRatio(text) * 100),
          english: Math.round(scoreText(text)),
        });
      }
    }

    if (depth >= maxDepth) return;

    for (const [id, dec] of Object.entries(decoders)) {
      if (!dec.detect(text)) continue;
      if (chain.some(s => s.id === id)) continue; // don't repeat
      const out = dec.run(text);
      if (!out || out === text || out.length < 1) continue;
      explore(out, [...chain, { id, label: dec.label }], depth + 1);
    }

    // Caesar brute — special case, try top 3 shifts
    if (/[a-zA-Z]/.test(text) && !chain.some(s => s.id === "caesar")) {
      const bfRes = bfCaesar(text).slice(0, 3).filter(r => r.score > 16);
      for (const r of bfRes) {
        explore(r.text, [...chain, { id: "caesar", label: `Caesar shift-${r.shift}` }], depth + 1);
      }
    }
  }

  explore(input, [], 0);

  return results
    .sort((a, b) => b.score - a.score || b.hasFlag - a.hasFlag)
    .slice(0, maxResults);
}

// ── Single-step detector ──────────────────────────────────────────────────────
// Returns detected possible transforms at the current layer

export function detectStep(text) {
  const detected = [];
  for (const [id, dec] of Object.entries(decoders)) {
    if (dec.detect(text)) detected.push({ id, label: dec.label });
  }
  if (/[a-zA-Z]/.test(text)) {
    const bfRes = bfCaesar(text).slice(0, 3).filter(r => r.score > 16);
    for (const r of bfRes) detected.push({ id: "caesar", label: `Caesar shift-${r.shift}`, shiftResult: r.text });
  }
  return detected;
}

// ── Apply single decoder ──────────────────────────────────────────────────────
export function applyDecoder(id, text, shiftOverride) {
  if (id === "caesar") {
    const bfRes = bfCaesar(text);
    if (shiftOverride !== undefined) {
      const r = bfRes.find(r => r.shift === shiftOverride);
      return r ? r.text : null;
    }
    return bfRes[0]?.text ?? null;
  }
  return decoders[id]?.run(text) ?? null;
}

// ── Format chain for display ──────────────────────────────────────────────────
export function buildLogLines(chainResult, inputText) {
  const lines = [];
  lines.push({ type: "cmd", text: `analyze "${inputText.slice(0, 50)}${inputText.length > 50 ? "…" : ""}"` });
  lines.push({ type: "sep" });

  let current = inputText;
  for (let i = 0; i < chainResult.chain.length; i++) {
    const step = chainResult.chain[i];
    lines.push({ type: "info", text: `Layer ${i + 1}: ${step.label}` });
    const next = applyDecoder(step.id, current);
    if (next) {
      const preview = next.slice(0, 80).replace(/\n/g, " ↵ ");
      lines.push({ type: "ok", text: preview + (next.length > 80 ? "…" : "") });
      current = next;
    }
  }

  lines.push({ type: "sep" });

  if (chainResult.hasFlag) {
    lines.push({ type: "flag", text: `FLAG FOUND: ${chainResult.output}` });
  } else {
    lines.push({ type: "ok", text: `Output: ${chainResult.output.slice(0, 120)}${chainResult.output.length > 120 ? "…" : ""}` });
  }

  lines.push({ type: "info", text: `Score: ${chainResult.score} · Printable: ${chainResult.printable}% · English: ${chainResult.english}` });

  return lines;
}
