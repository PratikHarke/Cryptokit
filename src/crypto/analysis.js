import { EN_FREQ } from "../constants.js";
import { caesarDec } from "./caesar.js";

// ─── Scoring Helpers ──────────────────────────────────────────────────────────

export function chiSquared(text) {
  const lower = text.toLowerCase().replace(/[^a-z]/g, "");
  if (!lower.length) return 999;
  const counts = {};
  for (const c of lower) counts[c] = (counts[c] || 0) + 1;
  let chi = 0;
  for (const [ch, expected] of Object.entries(EN_FREQ)) {
    const obs = ((counts[ch] || 0) / lower.length) * 100;
    chi += Math.pow(obs - expected, 2) / expected;
  }
  return chi;
}

export function scoreText(text) {
  const common = ["the","and","is","in","to","of","a","that","this","it","was","for","on","are"];
  const lower = text.toLowerCase();
  const ws = common.reduce((s, w) => s + (lower.includes(w) ? 1 : 0), 0);
  const printable = text.split("").filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127).length;
  return ws * 25 - chiSquared(text) * 0.5 + (printable / text.length) * 10;
}

// ─── Index of Coincidence ─────────────────────────────────────────────────────

export function ic(text) {
  const lower = text.toLowerCase().replace(/[^a-z]/g, "");
  const n = lower.length;
  if (n < 2) return 0;
  const freq = {};
  for (const c of lower) freq[c] = (freq[c] || 0) + 1;
  const sum = Object.values(freq).reduce((s, f) => s + f * (f - 1), 0);
  return (sum / (n * (n - 1))).toFixed(4);
}

// ─── Frequency Analysis ───────────────────────────────────────────────────────

export function freqAnalysis(text) {
  const lower = text.toLowerCase().replace(/[^a-z]/g, "");
  const counts = {};
  for (const c of lower) counts[c] = (counts[c] || 0) + 1;
  const total = lower.length;
  return Object.entries(counts)
    .map(([ch, cnt]) => ({
      char: ch,
      count: cnt,
      pct: total ? (cnt / total * 100).toFixed(2) : 0,
      expected: (EN_FREQ[ch] || 0).toFixed(1),
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Caesar Bruteforce ────────────────────────────────────────────────────────

export function bfCaesar(text) {
  return Array.from({ length: 26 }, (_, i) => ({
    shift: i,
    text: caesarDec(text, i),
    score: scoreText(caesarDec(text, i)),
  })).sort((a, b) => b.score - a.score);
}

// ─── XOR Single-Byte Bruteforce ───────────────────────────────────────────────

export function bfXor(hex) {
  if (!hex.match(/^[0-9a-fA-F\s]+$/)) return [];
  const clean = hex.replace(/\s/g, "");
  const bytes = clean.match(/.{2}/g)?.map(h => parseInt(h, 16));
  if (!bytes) return [];

  const FLAG_RE = /[a-z_]{2,20}\{[^}]{2,}\}/i;
  const COMMON_WORDS = ["the","and","is","in","to","of","a","for","flag","ctf","key","secret"];

  return Array.from({ length: 256 }, (_, k) => {
    const dec = new Uint8Array(bytes.map(b => b ^ k));
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(dec); } catch { text = ""; }
    if (!text) return { key: k, keyHex: "0x" + k.toString(16).padStart(2, "0"), text: "", score: -999 };

    const printable = text.split("").filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127).length;
    const printRatio = printable / text.length;
    const lower = text.toLowerCase();
    const wordHits = COMMON_WORDS.filter(w => lower.includes(w)).length;
    const hasFlag = FLAG_RE.test(text);
    const baseScore = scoreText(text) + wordHits * 5 + (printRatio > 0.95 ? 10 : 0);
    const flagBonus = hasFlag ? 100 : 0;

    return {
      key: k,
      keyHex: "0x" + k.toString(16).padStart(2, "0"),
      text,
      score: baseScore + flagBonus,
      hasFlag,
      printRatio,
    };
  }).filter(r => r.text && r.printRatio > 0.5).sort((a, b) => b.score - a.score).slice(0, 15);
}
