/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CryptKit v7 — pipelineEngine.js                            ║
 * ║  Multi-Layer Cryptanalysis Pipeline Engine                   ║
 * ║                                                              ║
 * ║  Orchestrates detector → transforms → scorer into a          ║
 * ║  BFS tree that finds the best decode chain automatically.    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * ── Architecture ────────────────────────────────────────────────
 *
 *  Input
 *    └─ detect()          → DetectionCandidate[]  (detector.js)
 *         └─ BFS frontier (max depth=3, prune bad paths early)
 *               └─ applyTransform()   (calls EXISTING crypto fns)
 *                    └─ quickScore()  (scorer.js — for pruning)
 *                         └─ Collect all leaf nodes
 *                              └─ rankCandidates()  → PipelineResult[]
 *
 * ── Anti-loop strategy ──────────────────────────────────────────
 *  1. State deduplication: hash of (output, stepsKey) in a Set.
 *  2. Stagnation check: if output === input, skip (no-op transform).
 *  3. Confidence floor: prune branches where quickScore < MIN_BRANCH_SCORE.
 *  4. Max breadth: try at most MAX_CANDIDATES detections per layer.
 *  5. Max depth: hard cap at MAX_DEPTH layers.
 *
 * ── Reuse map ───────────────────────────────────────────────────
 *  detect()        ← detector.js      (NEW)
 *  quickScore()    ← scorer.js        (NEW)
 *  rankCandidates()← scorer.js        (NEW)
 *  b64Dec()        ← base64.js        (existing)
 *  hexToAscii()    ← converters.js    (existing)
 *  morseDec()      ← morse.js         (existing)
 *  atbash()        ← atbash.js        (existing)
 *  rot13()         ← caesar.js        (existing)
 *  caesarDec()     ← caesar.js        (existing)
 *  bfCaesar()      ← analysis.js      (existing — picks best shift)
 *  bfXor()         ← analysis.js      (existing — picks best key)
 *  crackVigenere() ← vigenereAttack.js(existing)
 *  urlDecode()     ← converters.js    (existing)
 *
 * @module pipelineEngine
 */

import { detect, profileInput }    from './detector.js';
import { quickScore, rankCandidates } from './scorer.js';

// Existing crypto imports — NOT re-implemented
import { b64Dec }                  from './base64.js';
import { hexToAscii, urlDecode }   from './converters.js';
import { morseDec }                from './morse.js';
import { atbash }                  from './atbash.js';
import { rot13, caesarDec }        from './caesar.js';
import { bfCaesar, bfXor }         from './analysis.js';
import { crackVigenere }           from './vigenereAttack.js';
import { crackRepeatingXor }       from './xorAdvanced.js';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const MAX_DEPTH          = 3;   // maximum chain length
const MAX_CANDIDATES     = 6;   // detections tried per layer
const MAX_RESULTS        = 20;  // final results returned
const MIN_BRANCH_SCORE   = 15;  // prune further EXPANSION below this
const MIN_COLLECT_SCORE  = 5;   // still COLLECT results above this even if not expanding
const MAX_BFS_NODES      = 400; // hard safety cap on total BFS expansions

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} PipelineStep
 * @property {string} label      - Human-readable step name ("Base64 decode")
 * @property {string} toolId     - TOOL_REGISTRY id ("base64")
 * @property {Object} params     - Params used (e.g. { shift: 13 })
 * @property {string} output     - Text after this step
 * @property {number} scoreAfter - quickScore of output
 */

/**
 * @typedef {Object} PipelineResult
 * @property {PipelineStep[]} steps          - Ordered transform chain
 * @property {string}         finalOutput    - Text after all steps
 * @property {string}         original       - Original input
 * @property {import('./scorer.js').ScoreReport} score - Full score report
 * @property {number}         confidence     - 0–100 (mirror of score.confidence)
 * @property {boolean}        hasFlag
 * @property {string[]}       chainLabels    - e.g. ["Base64 decode", "ROT-13"]
 */

// ─────────────────────────────────────────────────────────────────────────────
// Transform executors
// Each entry maps a detection label → a function that tries to transform text.
// Returns { output: string, label: string, params: Object } or null on failure.
// ─────────────────────────────────────────────────────────────────────────────

export const TRANSFORMS = {

  'Base64': (text) => {
    try {
      const t = text.trim();
      if (!/^[A-Za-z0-9+/]+=*$/.test(t) || t.length % 4 !== 0) return null;
      const r = b64Dec(t);
      if (!r || r.startsWith('Invalid')) return null;
      return { output: r, label: 'Base64 decode', params: {} };
    } catch { return null; }
  },

  'Base64-URL': (text) => {
    try {
      const t = text.trim();
      const c = t.replace(/-/g, '+').replace(/_/g, '/');
      const p = c + '===='.slice(c.length % 4 || 4);
      const r = b64Dec(p);
      if (!r || r.startsWith('Invalid')) return null;
      return { output: r, label: 'Base64-URL decode', params: {} };
    } catch { return null; }
  },

  'Hex': (text) => {
    try {
      const r = hexToAscii(text.replace(/[\s:]/g, ''));
      if (!r || r.startsWith('Invalid')) return null;
      return { output: r, label: 'Hex → ASCII', params: {} };
    } catch { return null; }
  },

  'Binary': (text) => {
    try {
      const c = text.replace(/\s/g, '');
      if (c.length % 8 !== 0) return null;
      const output = String.fromCharCode(...c.match(/.{8}/g).map(b => parseInt(b, 2)));
      return { output, label: 'Binary → ASCII', params: {} };
    } catch { return null; }
  },

  'Morse Code': (text) => {
    try {
      const r = morseDec(text);
      if (!r || r.includes('?')) return null;
      return { output: r, label: 'Morse decode', params: {} };
    } catch { return null; }
  },

  'ROT-13': (text) => {
    try {
      const output = rot13(text);
      if (output === text) return null;
      return { output, label: 'ROT-13', params: {} };
    } catch { return null; }
  },

  'ROT-47': (text) => {
    try {
      const output = text.replace(/[!-~]/g, c =>
        String.fromCharCode(((c.charCodeAt(0) - 33 + 47) % 94) + 33));
      if (output === text) return null;
      return { output, label: 'ROT-47', params: {} };
    } catch { return null; }
  },

  'Atbash': (text) => {
    try {
      const output = atbash(text);
      if (output === text) return null;
      return { output, label: 'Atbash', params: {} };
    } catch { return null; }
  },

  'Caesar / Shift Cipher': (text) => {
    try {
      // bfCaesar already exists — picks the best shift by English score
      const results = bfCaesar(text);
      if (!results?.length) return null;
      const best = results[0];
      if (best.score < 0) return null;
      return {
        output: best.text,
        label:  `Caesar(shift=${best.shift})`,
        params: { shift: best.shift },
      };
    } catch { return null; }
  },

  'Vigenère Cipher': (text) => {
    try {
      const result = crackVigenere(text);
      if (!result?.plaintext) return null;
      return {
        output: result.plaintext,
        label:  `Vigenère(key="${result.key}")`,
        params: { key: result.key },
      };
    } catch { return null; }
  },

  'URL Encoded': (text) => {
    try {
      const output = urlDecode(text);
      if (output === text) return null;
      return { output, label: 'URL decode', params: {} };
    } catch { return null; }
  },

  'HTML Entities': (text) => {
    try {
      const doc    = new DOMParser().parseFromString(
        `<!DOCTYPE html><body>${text}</body>`, "text/html"
      );
      const output = doc.body.textContent;
      if (output === text) return null;
      return { output, label: 'HTML entity decode', params: {} };
    } catch { return null; }
  },

  'XOR (single-byte key)': (text) => {
    try {
      // bfXor already exists — returns top keys sorted by English score
      const results = bfXor(text.replace(/\s/g, ''));
      if (!results?.length) return null;
      const best = results[0];
      if (best.score < 0) return null;
      return {
        output: best.text,
        label:  `XOR(key=${best.keyHex})`,
        params: { key: best.keyHex, keyInt: best.key },
      };
    } catch { return null; }
  },

  'XOR (repeating key)': (text) => {
    try {
      const clean = text.replace(/\s/g, '');
      if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length < 16) return null;
      const result = crackRepeatingXor(clean);
      if (result.error || !result.results?.length) return null;
      const best = result.results[0];
      if (!best.decrypted || best.textScore < 10) return null;
      return {
        output: best.decrypted,
        label:  `XOR-repeating(key="${best.keyStr}")`,
        params: { keyHex: best.keyHex, keyStr: best.keyStr, keyLen: best.keyLen },
      };
    } catch { return null; }
  },

  'Bacon Cipher': (text) => {
    try {
      const BACON = {
        AAAAA:'a', AAAAB:'b', AAABA:'c', AAABB:'d', AABAA:'e',
        AABAB:'f', AABBA:'g', AABBB:'h', ABAAA:'i', ABAAB:'j',
        ABABA:'k', ABABB:'l', ABBAA:'m', ABBAB:'n', ABBBA:'o',
        ABBBB:'p', BAAAA:'q', BAAAB:'r', BAABA:'s', BAABB:'t',
        BABAA:'u', BABAB:'v', BABBA:'w', BABBB:'x', BBAAA:'y', BBAAB:'z',
      };
      const a = text.toUpperCase().replace(/[^A-Z]/g, '');
      const groups = a.match(/.{5}/g);
      if (!groups) return null;
      const output = groups.map(g => BACON[g] || '?').join('');
      if (output.includes('?')) return null;
      return { output, label: 'Bacon decode', params: {} };
    } catch { return null; }
  },

  'JWT Token': (text) => {
    try {
      const parts = text.trim().split('.');
      if (parts.length !== 3) return null;
      const pad = s => s + '='.repeat((4 - s.length % 4) % 4);
      const decodeB64 = s => atob(pad(s.replace(/-/g, '+').replace(/_/g, '/')));
      const header  = JSON.parse(decodeB64(parts[0]));
      const payload = JSON.parse(decodeB64(parts[1]));
      const output  = JSON.stringify({ header, payload }, null, 2);
      return { output, label: 'JWT decode', params: {} };
    } catch { return null; }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// BFS pipeline engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} BFSNode
 * @property {string}        text   - Current text state
 * @property {PipelineStep[]}chain  - Steps taken so far
 * @property {number}        depth  - Current depth
 */

/**
 * Run the full multi-layer cryptanalysis pipeline.
 *
 * @param {string} input                          - Raw ciphertext
 * @param {Object} [opts]
 * @param {number} [opts.maxDepth=3]              - Maximum chain length
 * @param {number} [opts.maxCandidates=6]         - Detections tried per step
 * @param {number} [opts.minBranchScore=15]       - Prune branches below this
 * @param {function} [opts.onProgress]            - (nodesExplored, queueLen) => void
 * @returns {PipelineResult[]}                    - Sorted best-first
 */
export function runPipeline(input, opts = {}) {
  const maxDepth      = opts.maxDepth      ?? MAX_DEPTH;
  const maxCandidates = opts.maxCandidates ?? MAX_CANDIDATES;
  const minBranch     = opts.minBranchScore ?? MIN_BRANCH_SCORE;
  const minCollect    = opts.minCollectScore ?? MIN_COLLECT_SCORE;
  const onProgress    = opts.onProgress    ?? null;

  const original   = input;
  const seen       = new Set();       // dedup: stateKey → visited
  const collected  = [];              // all leaf/intermediate results
  let   nodesCount = 0;

  // BFS frontier
  const queue = [{ text: input, chain: [], depth: 0 }];

  while (queue.length > 0 && nodesCount < MAX_BFS_NODES) {
    const node = queue.shift();
    nodesCount++;
    if (onProgress) onProgress(nodesCount, queue.length);

    // ── Collect this node as a candidate result ──
    // Use minCollect (lower floor) so multi-step chains that score moderately
    // at each step are not silently dropped before final ranking.
    if (node.chain.length > 0) {
      const sc = quickScore(node.text, original);
      if (sc >= minCollect) {
        collected.push({ text: node.text, steps: node.chain, score: sc });
      }
    }

    // ── Stop expanding at max depth ──
    if (node.depth >= maxDepth) continue;

    // ── Detect applicable transforms for current state ──
    const detections = detect(node.text).slice(0, maxCandidates);

    for (const det of detections) {
      // Hashes can't be decoded — skip in pipeline
      if (det.category === 'hash') continue;

      const executor = TRANSFORMS[det.label];
      if (!executor) continue;

      let transformed;
      try { transformed = executor(node.text); } catch { continue; }
      if (!transformed) continue;

      // ── Anti-loop: skip no-op transforms ──
      if (transformed.output === node.text) continue;

      // ── Anti-loop: state dedup ──
      const stateKey = node.chain.map(s => s.label).join('>') + '>' + transformed.label + '|' + transformed.output.slice(0, 64);
      if (seen.has(stateKey)) continue;
      seen.add(stateKey);

      // ── Confidence floor — prune further EXPANSION of low-value branches ──
      // depth 0→1 is always explored (first layer); deeper branches need minBranch.
      const afterScore = quickScore(transformed.output, original);
      if (afterScore < minBranch && node.depth > 0) continue;

      const step = {
        label:      transformed.label,
        toolId:     det.toolId,
        params:     transformed.params,
        output:     transformed.output,
        scoreAfter: afterScore,
      };

      queue.push({
        text:  transformed.output,
        chain: [...node.chain, step],
        depth: node.depth + 1,
      });
    }
  }

  // ── Rank and format final results ──
  const ranked = rankCandidates(
    collected.map(c => ({ text: c.text, steps: c.steps })),
    original
  );

  return ranked
    .slice(0, MAX_RESULTS)
    .map(r => ({
      steps:           r.steps,
      finalOutput:     r.text,
      original,
      score:           r.score,
      confidence:      r.score.confidence,
      hasFlag:         r.score.hasFlag,
      chainLabels:     r.steps.map(s => s.label),
      // v9 additions — undefined-safe; existing UI checks before render
      intermediateResults: r.steps.map(s => ({
        step:       s.label,
        output:     s.output,
        confidence: s.scoreAfter,
      })),
      scoreBreakdown: r.score.breakdown ?? null,
    }));
}

/**
 * Synchronous wrapper — runs the pipeline and returns results immediately.
 * For async/worker offloading, wrap runPipeline in a Promise.
 *
 * @param {string} input
 * @param {Object} [opts]
 * @returns {PipelineResult[]}
 */
export function analyse(input, opts = {}) {
  if (!input?.trim()) return [];
  try {
    return runPipeline(input.trim(), opts);
  } catch (err) {
    console.error('[pipelineEngine] analyse() failed:', err);
    return [];
  }
}

/**
 * Apply a single named transform to text.
 * Useful for the UI to preview individual steps without running the full pipeline.
 *
 * @param {string} transformLabel - Must match a key in TRANSFORMS
 * @param {string} text
 * @returns {{ output: string, label: string, params: Object } | null}
 */
export function applyTransform(transformLabel, text) {
  const fn = TRANSFORMS[transformLabel];
  if (!fn) return null;
  try { return fn(text); } catch { return null; }
}

/**
 * List available transform names (for UI dropdowns / debug).
 * @returns {string[]}
 */
export function listTransforms() {
  return Object.keys(TRANSFORMS);
}
