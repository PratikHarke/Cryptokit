/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CryptKit v7 — scorer.js                                    ║
 * ║  Confidence Scoring & Ranking System                         ║
 * ║                                                              ║
 * ║  Extends (does NOT replace) scoreText() from analysis.js.   ║
 * ║  Provides a richer ScoreReport used by pipelineEngine.       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * ── Score Formula ────────────────────────────────────────────────
 *
 *  FINAL = clamp(
 *    wordScore    * 0.40   (English word presence — highest weight)
 *  + printable    * 0.25   (printable ASCII fraction)
 *  + chiImprove   * 0.20   (chi-squared improvement vs input)
 *  + icBonus      * 0.10   (IC closeness to English 0.065)
 *  + entropyBonus * 0.05   (entropy reduction from original)
 *  + flagBonus            (flat +25 if CTF flag pattern found)
 *  , 0, 100
 *  )
 *
 * Each sub-score is normalised to 0–100 before weighting.
 * Weights sum to 1.0 (excluding flat bonuses).
 *
 * Reuses from existing codebase:
 *   chiSquared()   ← analysis.js
 *   scoreText()    ← analysis.js  (used as cross-check / normaliser)
 *   shannonEntropy()← entropy.js
 *
 * @module scorer
 */

import { chiSquared, scoreText } from './analysis.js';
import { shannonEntropy }        from './entropy.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ScoreReport
 * @property {number} confidence      - Final 0–100 integer score
 * @property {number} wordScore       - Raw 0–100 English-word sub-score
 * @property {number} printableRatio  - 0.0–1.0 printable ASCII fraction
 * @property {number} chiScore        - 0–100 chi-squared sub-score (inverted)
 * @property {number} icScore         - 0–100 IC closeness sub-score
 * @property {number} entropyDelta    - Entropy reduction (positive = better)
 * @property {boolean} hasFlag        - CTF flag pattern found
 * @property {string} grade           - "🏁 FLAG" | "A" | "B" | "C" | "D" | "F"
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Common English words used for word-match scoring */
const WORD_LIST = [
  // Function words (high frequency)
  'the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'this', 'it',
  'was', 'for', 'on', 'are', 'with', 'as', 'at', 'be', 'by', 'from',
  'have', 'or', 'an', 'but', 'not', 'had', 'we', 'they', 'you', 'he',
  'she', 'his', 'her', 'its', 'our', 'their', 'my', 'your', 'what',
  'all', 'been', 'has', 'can', 'will', 'one', 'if', 'do', 'so', 'up',
  'out', 'no', 'get', 'go', 'me', 'him', 'who', 'which', 'more', 'how',
  // Common nouns & verbs
  'hello', 'world', 'message', 'text', 'data', 'file', 'test', 'note',
  'name', 'time', 'year', 'good', 'new', 'old', 'just', 'see', 'now',
  'make', 'come', 'look', 'use', 'find', 'give', 'tell', 'call', 'try',
  'work', 'much', 'well', 'also', 'back', 'then', 'over', 'may', 'said',
  'way', 'day', 'man', 'any', 'first', 'people', 'think', 'know', 'into',
  'year', 'take', 'after', 'place', 'live', 'never', 'still', 'these',
  'home', 'life', 'hand', 'long', 'most', 'need', 'next', 'only', 'own',
  'part', 'read', 'real', 'right', 'same', 'some', 'than', 'them', 'want',
  // CTF / security context words
  'flag', 'ctf', 'key', 'secret', 'password', 'admin', 'user', 'root',
  'token', 'auth', 'hash', 'salt', 'cipher', 'decode', 'encode', 'access',
  'hidden', 'found', 'value', 'answer', 'solve', 'level', 'challenge',
];

/** English IC target */
const EN_IC = 0.0667;

/** Chi-squared for pure English text (typical good decryption ~5–15) */
const CHI_PERFECT  = 5;
const CHI_TERRIBLE = 250;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-score helpers  (each returns 0–100)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Token word-ratio sub-score.
 * Measures what fraction of whitespace-split tokens are pure alphabetic words (2+ chars).
 * Strong signal: "Hello World" → 100%, "aB3$xZ" → 0%, binary garbage → 0%.
 */
function tokenWordScore(text) {
  const tokens = text.trim().split(/\s+/).filter(t => t.length > 0);
  if (!tokens.length) return 0;
  const wordTokens = tokens.filter(t => /^[a-zA-Z]{2,}$/.test(t)).length;
  return (wordTokens / tokens.length) * 100;
}

/**
 * Word-presence sub-score.
 * Uses weighted common-word list: longer/rarer words score more.
 * Formula: Σ weight(word) * present(word) / Σ weight(word) * 100
 */
function wordSubScore(text) {
  const lower = text.toLowerCase();
  // Weight by word length (longer = rarer = more signal)
  let total  = 0;
  let scored = 0;
  for (const w of WORD_LIST) {
    const weight = Math.max(1, w.length - 2); // "the"→1, "admin"→3, etc.
    total += weight;
    if (lower.includes(w)) scored += weight;
  }
  return total > 0 ? (scored / total) * 100 : 0;
}

/**
 * Printable-ASCII sub-score.
 * 100 = all chars printable; 0 = all non-printable.
 */
function printableSubScore(text) {
  if (!text.length) return 0;
  const pr = text.split('').filter(c => {
    const code = c.charCodeAt(0);
    return code >= 32 && code < 127;
  }).length / text.length;
  return pr * 100;
}

/**
 * Chi-squared sub-score.
 * Inverts chi: perfect English → chi≈5 → score 100; gibberish → chi≈250 → score 0.
 * Formula: clamp((CHI_TERRIBLE - chi) / (CHI_TERRIBLE - CHI_PERFECT), 0, 1) * 100
 */
function chiSubScore(text) {
  const chi = chiSquared(text);
  const norm = (CHI_TERRIBLE - chi) / (CHI_TERRIBLE - CHI_PERFECT);
  return Math.round(Math.max(0, Math.min(1, norm)) * 100);
}

/**
 * IC (Index of Coincidence) sub-score.
 * Measures how close IC is to English (0.0667).
 * Formula: 100 - 100 * |IC - EN_IC| / EN_IC
 */
function icSubScore(text) {
  const letters = text.toLowerCase().replace(/[^a-z]/g, '');
  if (letters.length < 4) return 0;
  const n = letters.length;
  const freq = {};
  for (const c of letters) freq[c] = (freq[c] || 0) + 1;
  const sum = Object.values(freq).reduce((s, f) => s + f * (f - 1), 0);
  const icVal = sum / (n * (n - 1));
  const dist  = Math.abs(icVal - EN_IC) / EN_IC;
  return Math.round(Math.max(0, 1 - dist) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main exports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score a candidate decryption result.
 *
 * @param {string} text           - Candidate output text
 * @param {string} [original=''] - Original input (used for entropy delta)
 * @returns {ScoreReport}
 */
export function score(text, original = '') {
  if (!text) return nullReport();

  const wScore  = wordSubScore(text);
  const tScore  = tokenWordScore(text);
  const pScore  = printableSubScore(text);
  const cScore  = chiSubScore(text);
  const iScore  = icSubScore(text);
  const hasFlag = /flag\{[^}]+\}/i.test(text) || /ctf\{[^}]+\}/i.test(text) ||
                  /[a-z_]{2,20}\{[^}]+\}/i.test(text);

  // Entropy delta: positive = output is "less random" than input (good)
  let entropyDelta = 0;
  if (original) {
    const origBytes = Array.from(new TextEncoder().encode(original));
    const outBytes  = Array.from(new TextEncoder().encode(text));
    const origH = shannonEntropy(origBytes);
    const outH  = shannonEntropy(outBytes);
    entropyDelta = +(origH - outH).toFixed(3);
  }

  // Entropy bonus: normalise delta to 0–100 (cap at ±4 bits)
  const entropyBonus = Math.round(Math.max(0, Math.min(100, (entropyDelta / 4) * 100)));

  // Weighted sum — tokenWordScore (tScore) carries the most weight because
  // pure-alpha word tokens are the strongest signal for readable output.
  // printable (pScore) is the second strongest floor for clean text.
  const raw = (
    tScore  * 0.42 +   // fraction of tokens that are pure alphabetic words
    wScore  * 0.15 +   // WORD_LIST word presence
    pScore  * 0.25 +   // printable ASCII ratio
    cScore  * 0.10 +   // chi-squared vs English
    iScore  * 0.05 +   // Index of Coincidence
    entropyBonus * 0.03  // entropy reduction from original
  );

  const flagBonus   = hasFlag ? 45 : 0;   // flag patterns are very strong evidence
  const confidence  = Math.round(Math.min(100, raw + flagBonus));

  return {
    confidence,
    wordScore:      Math.round(wScore),
    printableRatio: +(pScore / 100).toFixed(3),
    chiScore:       Math.round(cScore),
    icScore:        Math.round(iScore),
    entropyDelta,
    hasFlag,
    grade:          grade(confidence, hasFlag),
  };
}

/**
 * Score multiple candidates and return them sorted best-first.
 *
 * @param {{ text: string, steps: string[] }[]} candidates
 * @param {string} original
 * @returns {{ text: string, steps: string[], score: ScoreReport }[]}
 */
export function rankCandidates(candidates, original = '') {
  return candidates
    .map(c => ({ ...c, score: score(c.text, original) }))
    .sort((a, b) => b.score.confidence - a.score.confidence);
}

/**
 * Quick single-number confidence (0–100).
 * Suitable for chain-step pruning in pipelineEngine.
 *
 * @param {string} text
 * @param {string} [original]
 * @returns {number}
 */
export function quickScore(text, original = '') {
  return score(text, original).confidence;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function grade(confidence, hasFlag) {
  if (hasFlag)          return '🏁 FLAG';
  if (confidence >= 85) return 'A';
  if (confidence >= 70) return 'B';
  if (confidence >= 50) return 'C';
  if (confidence >= 30) return 'D';
  return 'F';
}

function nullReport() {
  return {
    confidence: 0, wordScore: 0, printableRatio: 0,
    chiScore: 0, icScore: 0, entropyDelta: 0, hasFlag: false, grade: 'F',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// v9 extension: scoreBreakdown() + continuous flagScore
// Zero breaking changes — existing callers of score() / quickScore() untouched.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Continuous flag score — 0 if no pattern, up to 25 scaled by specificity.
 * Replaces the old boolean hasFlag +25 bonus with a graded signal.
 * @param {string} text
 * @returns {number} 0 | 5 | 8 | 18 | 25
 */
function flagSubScore(text) {
  if (/\bflag\{[^}]{3,}\}/i.test(text))              return 25;  // exact CTF flag
  if (/\b[a-z_]{2,20}\{[^}]{3,}\}/i.test(text))      return 18;  // generic wrapper
  if (/[a-z]{2,}\{/.test(text))                       return 8;   // partial opener
  if (/\b(flag|secret|password|admin|key)\b/i.test(text)) return 5; // suspicious keyword
  return 0;
}

/**
 * @typedef {Object} ScoreBreakdownShape
 * @property {number} printable      - 0–25 weighted contribution
 * @property {number} englishWords   - 0–40
 * @property {number} chiImprove     - 0–20
 * @property {number} icBonus        - 0–10
 * @property {number} entropyImprove - 0–5
 * @property {number} flagPattern    - 0–25 (continuous, not boolean)
 * @property {number} total          - sum, clamped 0–100
 */

/**
 * Full breakdown — same inputs as score(), zero risk to existing callers.
 * Adds flagScore as continuous + exposes each weighted contribution.
 *
 * @param {string} text
 * @param {string} [original='']
 * @returns {import('./scorer.js').ScoreReport & { breakdown: ScoreBreakdownShape, flagScore: number }}
 */
export function scoreBreakdown(text, original = '') {
  const base = score(text, original);   // existing score() — untouched

  const flagPts  = flagSubScore(text);
  const printPts = Math.round(base.printableRatio * 25);
  const wordPts  = Math.round((base.wordScore / 100) * 40);
  const chiPts   = Math.round((base.chiScore  / 100) * 20);
  const icPts    = Math.round((base.icScore   / 100) * 10);
  const entPts   = Math.round(Math.max(0, Math.min(5, base.entropyDelta)));

  const total = Math.min(100, printPts + wordPts + chiPts + icPts + entPts + flagPts);

  return {
    ...base,           // backward compat: all existing fields preserved
    breakdown: {
      printable:      printPts,
      englishWords:   wordPts,
      chiImprove:     chiPts,
      icBonus:        icPts,
      entropyImprove: entPts,
      flagPattern:    flagPts,
      total,
    },
    flagScore: flagPts,   // convenience alias
  };
}
