/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CryptKit v7 — detector.js                                  ║
 * ║  Auto-Detection Layer                                        ║
 * ║                                                              ║
 * ║  Takes raw input → returns ranked DetectionCandidate[]       ║
 * ║  Every candidate maps to an existing TOOL_REGISTRY id.       ║
 * ║  NO crypto algorithms are re-implemented here.               ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Reuses from existing codebase:
 *   shannonEntropy()  ← entropy.js
 *   ic(), chiSquared(), scoreText()  ← analysis.js
 *
 * @module detector
 */

import { shannonEntropy } from './entropy.js';
import { ic, chiSquared, scoreText } from './analysis.js';

// ─────────────────────────────────────────────────────────────────────────────
// JSDoc types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} DetectionCandidate
 * @property {string}  toolId     - Exact id from TOOL_REGISTRY (e.g. "base64", "bf_caesar")
 * @property {string}  label      - Human-readable name
 * @property {string}  category   - "encoding" | "classical" | "xor" | "hash" | "other"
 * @property {number}  confidence - 0–100 integer
 * @property {Object}  params     - Suggested decode params (may be empty {})
 * @property {string}  hint       - One-line rationale shown in UI
 */

/**
 * @typedef {Object} InputProfile
 * @property {number}  length
 * @property {number}  entropy          - Shannon entropy (0–8)
 * @property {number}  ic               - Index of Coincidence
 * @property {number}  printableRatio   - Fraction of printable ASCII chars
 * @property {number}  uniqueCharRatio  - Unique chars / total chars
 * @property {boolean} isLikelyEnglish
 * @property {boolean} isLikelyCipher   - Monoalphabetic signature
 * @property {boolean} isLikelyPolyalpha
 * @property {boolean} isLikelyEncoded  - High entropy but all printable
 * @property {boolean} isLikelyEncrypted
 * @property {boolean} containsFlag
 */

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Fraction of non-whitespace chars that are printable ASCII (32–126) */
const printableRatio = s => {
  const c = s.replace(/\s/g, '');
  if (!c.length) return 0;
  return c.split('').filter(x => x.charCodeAt(0) >= 32 && x.charCodeAt(0) < 127).length / c.length;
};

/** TextEncoder bytes for entropy computation */
const toBytes = s => Array.from(new TextEncoder().encode(s));

/** Unique character diversity */
const uniqueCharRatio = s => new Set(s.split('')).size / Math.max(s.length, 1);

/** Apply rot13 without importing (avoids circular deps in tests) */
const rot13 = s =>
  s.replace(/[A-Za-z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });

/** Apply atbash without importing */
const atbashFn = s =>
  s.replace(/[A-Za-z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(base + 25 - (c.charCodeAt(0) - base));
  });

// ─────────────────────────────────────────────────────────────────────────────
// Detector rules
// Each rule: { toolId, label, category, test(input) → 0–100, params(input), hint }
//
// Rules are ordered intentionally — more specific checks first.
// ─────────────────────────────────────────────────────────────────────────────

const RULES = [
  // ── JWT (most specific: three b64url segments) ────────────────────────────
  {
    toolId:   'jwt',
    label:    'JWT Token',
    category: 'encoding',
    test(s) {
      const p = s.trim().split('.');
      if (p.length !== 3) return 0;
      if (!p.every(x => /^[A-Za-z0-9+/=_-]+$/.test(x) && x.length > 0)) return 0;
      try { JSON.parse(atob(p[0].replace(/-/g, '+').replace(/_/g, '/'))); return 95; }
      catch { return 75; }
    },
    params: () => ({}),
    hint: 'Three base64url segments with JSON header → JWT.',
  },

  // ── Morse code ─────────────────────────────────────────────────────────────
  {
    toolId:   'morse',
    label:    'Morse Code',
    category: 'encoding',
    test(s) {
      const t = s.trim();
      if (!/^[.\-/ ]+$/.test(t))                  return 0;
      if (!t.includes('.') || !t.includes('-'))    return 0;
      if (t.length < 3)                            return 0;
      return 90;
    },
    params: () => ({}),
    hint: 'Dots, dashes, slashes only → Morse.',
  },

  // ── Binary ─────────────────────────────────────────────────────────────────
  {
    toolId:   'converter',
    label:    'Binary',
    category: 'encoding',
    test(s) {
      const t = s.replace(/\s/g, '');
      if (!/^[01]+$/.test(t))           return 0;
      if (t.length % 8 !== 0)           return 0;
      if (t.length < 8)                 return 0;
      return 88;
    },
    params: () => ({ mode: 'binary' }),
    hint: 'All 0/1 chars, length divisible by 8 → binary-encoded ASCII.',
  },

  // ── Bacon cipher (2 unique letters, multiple of 5) ─────────────────────────
  {
    toolId:   'classicalextra',
    label:    'Bacon Cipher',
    category: 'classical',
    test(s) {
      const a = s.toUpperCase().replace(/[^A-Z]/g, '');
      if (new Set(a.split('')).size !== 2) return 0;
      if (a.length < 10 || a.length % 5 !== 0) return 0;
      return 85;
    },
    params: () => ({ cipher: 'bacon' }),
    hint: 'Exactly 2 unique letters, length ÷5 → Bacon encoding.',
  },

  // ── Base64-URL ─────────────────────────────────────────────────────────────
  {
    toolId:   'base64',
    label:    'Base64-URL',
    category: 'encoding',
    test(s) {
      const t = s.trim();
      if (!/^[A-Za-z0-9\-_]+=*$/.test(t)) return 0;
      if (/^[A-Za-z0-9+/]+=*$/.test(t))  return 0; // standard Base64 wins
      if (t.length < 4)                   return 0;
      return 72;
    },
    params: () => ({ variant: 'url' }),
    hint: 'URL-safe Base64 alphabet (- and _ instead of + and /).',
  },

  // ── Standard Base64 ────────────────────────────────────────────────────────
  {
    toolId:   'base64',
    label:    'Base64',
    category: 'encoding',
    test(s) {
      const t = s.trim();
      if (!/^[A-Za-z0-9+/]+=*$/.test(t)) return 0;
      if (t.length % 4 !== 0)            return 0;
      if (t.length < 4)                  return 0;
      let bonus = 0;
      try {
        const dec = atob(t);
        const pr = dec.split('').filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127).length / dec.length;
        bonus = pr * 30; // up to +30 if decoded output is printable
      } catch {}
      return Math.min(60 + bonus, 95);
    },
    params: () => ({}),
    hint: 'Base64 alphabet + padding. Decoded output confidence included.',
  },

  // ── Hash identification ────────────────────────────────────────────────────
  {
    toolId:   'hashid',
    label:    'Cryptographic Hash',
    category: 'hash',
    test(s) {
      const t = s.trim();
      if (/^[0-9a-fA-F]{32}$/.test(t))  return 92; // MD5
      if (/^[0-9a-fA-F]{40}$/.test(t))  return 92; // SHA-1
      if (/^[0-9a-fA-F]{64}$/.test(t))  return 92; // SHA-256
      if (/^[0-9a-fA-F]{128}$/.test(t)) return 90; // SHA-512
      if (/^\$2[aby]\$/.test(t))         return 94; // bcrypt
      if (/^\$argon2/.test(t))           return 94; // argon2
      if (/^\$pbkdf2/.test(t))           return 88; // PBKDF2
      return 0;
    },
    params: () => ({}),
    hint: 'Fixed-length hex or hash-specific prefix detected.',
  },

  // ── Hex-encoded data ───────────────────────────────────────────────────────
  {
    toolId:   'converter',
    label:    'Hex',
    category: 'encoding',
    test(s) {
      const t = s.replace(/[\s:]/g, '');
      if (!/^[0-9a-fA-F]+$/.test(t))   return 0;
      if (t.length % 2 !== 0)          return 0;
      if (t.length < 4)                return 0;
      const bytes = t.match(/.{2}/g).map(h => parseInt(h, 16));
      const pr = bytes.filter(b => b >= 32 && b < 127).length / bytes.length;
      const H  = shannonEntropy(bytes);
      // High printable ratio → likely data, not hash → confidence boost
      return Math.min(50 + pr * 35 + (H < 6 ? 5 : 0), 92);
    },
    params: () => ({ mode: 'hex' }),
    hint: 'Even-length hex string. Printable-byte ratio factored into score.',
  },

  // ── URL encoding ───────────────────────────────────────────────────────────
  {
    toolId:   'modernenc',
    label:    'URL Encoded',
    category: 'encoding',
    test(s) {
      if (!/%[0-9a-fA-F]{2}/.test(s))  return 0;
      const pct = (s.match(/%[0-9a-fA-F]{2}/g) || []).length;
      return Math.min(50 + pct * 5, 88);
    },
    params: () => ({ mode: 'url' }),
    hint: 'Percent-encoded sequences detected.',
  },

  // ── HTML entities ──────────────────────────────────────────────────────────
  {
    toolId:   'modernenc',
    label:    'HTML Entities',
    category: 'encoding',
    test(s) {
      if (!(/&[a-z#][a-z0-9]{1,8};/i.test(s))) return 0;
      const ents = (s.match(/&[a-z#][a-z0-9]{1,8};/gi) || []).length;
      return Math.min(55 + ents * 8, 85);
    },
    params: () => ({ mode: 'html' }),
    hint: 'HTML entity references (&amp; &#x...;) detected.',
  },

  // ── ROT-13 ─────────────────────────────────────────────────────────────────
  {
    toolId:   'rot13',
    label:    'ROT-13',
    category: 'classical',
    test(s) {
      if (!/[a-zA-Z]/.test(s)) return 0;
      const before = scoreText(s);
      const after  = scoreText(rot13(s));
      if (after > before + 15) return 80;
      if (after > before + 5)  return 55;
      return 0;
    },
    params: () => ({}),
    hint: 'ROT-13 application raises English readability score.',
  },

  // ── Caesar / general shift ─────────────────────────────────────────────────
  {
    toolId:   'bf_caesar',
    label:    'Caesar / Shift Cipher',
    category: 'classical',
    test(s) {
      if (!/[a-zA-Z]/.test(s))                              return 0;
      if (s.replace(/[^a-zA-Z]/g, '').length < 6)          return 0;
      const icVal = parseFloat(ic(s));
      // English IC ~0.065; random ~0.038; monoalpha ciphers preserve IC
      if (icVal >= 0.062 && icVal <= 0.075) return 72;
      if (icVal >= 0.055 && icVal <  0.062) return 48;
      return 0;
    },
    params: () => ({}),
    hint: `IC ${parseFloat(ic('x') || 0).toFixed(3)} ≈ English → monoalphabetic. All 26 shifts scored.`,
  },

  // ── Atbash ─────────────────────────────────────────────────────────────────
  {
    toolId:   'atbash',
    label:    'Atbash',
    category: 'classical',
    test(s) {
      if (!/[a-zA-Z]/.test(s)) return 0;
      const before = scoreText(s);
      const after  = scoreText(atbashFn(s));
      if (after > before + 15) return 70;
      if (after > before + 5)  return 45;
      return 0;
    },
    params: () => ({}),
    hint: 'Atbash (A↔Z) raises English score.',
  },

  // ── Vigenère (polyalphabetic) ──────────────────────────────────────────────
  {
    toolId:   'vigcrack',
    label:    'Vigenère Cipher',
    category: 'classical',
    test(s) {
      const letters = s.replace(/[^a-zA-Z]/g, '');
      if (letters.length < 20)                    return 0;
      const icVal = parseFloat(ic(s));
      // Polyalphabetic ciphers flatten IC toward random (~0.038)
      if (icVal >= 0.038 && icVal <  0.052) return 75;
      if (icVal >= 0.052 && icVal <  0.058) return 50;
      return 0;
    },
    params: () => ({}),
    hint: 'Low IC → polyalphabetic. Kasiski + IC attack will auto-run.',
  },

  // ── XOR single-byte ────────────────────────────────────────────────────────
  {
    toolId:   'bf_xor',
    label:    'XOR (single-byte key)',
    category: 'xor',
    test(s) {
      const t = s.replace(/\s/g, '');
      if (!/^[0-9a-fA-F]+$/.test(t))  return 0;
      if (t.length % 2 !== 0)         return 0;
      if (t.length < 8)               return 0;
      const bytes = t.match(/.{2}/g).map(h => parseInt(h, 16));
      const H = shannonEntropy(bytes);
      // XOR with single byte → entropy comparable to plaintext XOR'd with constant
      if (H >= 6.0 && H <= 7.5) return 68;
      if (H >= 5.0 && H <  6.0) return 45;
      return 0;
    },
    params: () => ({}),
    hint: 'High-entropy hex → try all 256 single-byte XOR keys.',
  },

  // ── XOR repeating key ─────────────────────────────────────────────────────
  {
    toolId:   'xorcracker',
    label:    'XOR (repeating key)',
    category: 'xor',
    test(s) {
      const t = s.replace(/\s/g, '');
      if (!/^[0-9a-fA-F]+$/.test(t)) return 0;
      if (t.length < 32)             return 0; // need enough bytes for Hamming distance
      const bytes = t.match(/.{2}/g).map(h => parseInt(h, 16));
      const H = shannonEntropy(bytes);
      if (H >= 5.5 && H < 7.5) return 62;
      return 0;
    },
    params: () => ({}),
    hint: 'Moderate entropy + sufficient length → try repeating-key XOR.',
  },

  // ── ROT-47 (printable ASCII shifted) ─────────────────────────────────────
  {
    toolId:   'rot13',   // closest existing tool (no dedicated rot47 view)
    label:    'ROT-47',
    category: 'classical',
    test(s) {
      if (!/[!-~]/.test(s)) return 0;
      const applied = s.replace(/[!-~]/g, c =>
        String.fromCharCode(((c.charCodeAt(0) - 33 + 47) % 94) + 33));
      const before = scoreText(s);
      const after  = scoreText(applied);
      if (after > before + 15) return 68;
      return 0;
    },
    params: () => ({ variant: 'rot47' }),
    hint: 'ROT-47 (full printable-ASCII rotation) improves score.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyse input and return ranked DetectionCandidates.
 * Results are deduplicated per (toolId, label) pair — highest confidence wins.
 *
 * @param {string} input
 * @returns {DetectionCandidate[]}  Sorted descending by confidence
 */
export function detect(input) {
  if (!input?.trim()) return [];

  const raw = [];
  for (const rule of RULES) {
    try {
      const confidence = rule.test(input);
      if (confidence > 0) {
        raw.push({
          toolId:     rule.toolId,
          label:      rule.label,
          category:   rule.category,
          confidence: Math.round(Math.max(0, Math.min(100, confidence))),
          params:     rule.params(input),
          hint:       rule.hint,
        });
      }
    } catch {
      // Individual detector failure must never crash the whole pipeline
    }
  }

  // Deduplicate — keep highest confidence per (toolId, label)
  const best = new Map();
  for (const r of raw) {
    const key = `${r.toolId}::${r.label}`;
    if (!best.has(key) || r.confidence > best.get(key).confidence) {
      best.set(key, r);
    }
  }

  return [...best.values()].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Top-1 detection result.
 * @param {string} input
 * @returns {DetectionCandidate | null}
 */
export function detectTop(input) {
  const results = detect(input);
  return results[0] ?? null;
}

/**
 * Compute a statistical profile of the input for decision-making in pipelineEngine.
 *
 * @param {string} input
 * @returns {InputProfile}
 */
export function profileInput(input) {
  const bytes = toBytes(input);
  const H     = shannonEntropy(bytes);
  const icVal = parseFloat(ic(input)) || 0;
  const pr    = printableRatio(input);
  const ucr   = uniqueCharRatio(input.replace(/\s/g, ''));

  return {
    length:          input.length,
    entropy:         +H.toFixed(4),
    ic:              +icVal.toFixed(4),
    printableRatio:  +pr.toFixed(4),
    uniqueCharRatio: +ucr.toFixed(4),
    // Derived flags for pipeline pruning
    isLikelyEnglish:    icVal > 0.060 && pr > 0.95 && H < 4.5,
    isLikelyCipher:     icVal > 0.058 && icVal < 0.078 && pr > 0.88,
    isLikelyPolyalpha:  icVal >= 0.038 && icVal < 0.055,
    isLikelyEncoded:    H > 4.5 && pr > 0.97,
    isLikelyEncrypted:  H > 6.5,
    isLikelyCompressed: H > 7.5,
    containsFlag:       /flag\{[^}]+\}/i.test(input) || /ctf\{[^}]+\}/i.test(input),
  };
}
