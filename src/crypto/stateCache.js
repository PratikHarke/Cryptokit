/**
 * stateCache.js — v9
 * FNV-1a 32-bit content hash deduplication for beam search.
 * Drop-in upgrade over the plain Set<string> used in pipelineEngine v8.
 * The has() interface is intentionally identical to Set.has() so callers
 * can swap with a one-line change.
 */

// ── FNV-1a 32-bit hash ────────────────────────────────────────────────────────
// Fast, no deps, good distribution for short-to-medium strings.
function fnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;   // keep 32-bit unsigned
  }
  return hash;
}

// ── StateCache ────────────────────────────────────────────────────────────────

export class StateCache {
  constructor() {
    this._visited = new Set();
    this._hits    = 0;
    this._misses  = 0;
  }

  /**
   * Returns true if this (output text, transform chain) combo was already
   * explored. Automatically records the key on first miss.
   *
   * @param {string}   output      - Current decoded text
   * @param {string[]} chainLabels - Labels of transforms applied so far
   * @returns {boolean}
   */
  has(output, chainLabels) {
    // Hash the full output (not just a 64-char prefix) for correctness,
    // and hash the chain separately so two paths to the same text via
    // different routes are each counted once.
    const key = `${fnv1a(output)}:${fnv1a(chainLabels.join('>'))}`;
    if (this._visited.has(key)) {
      this._hits++;
      return true;
    }
    this._visited.add(key);
    this._misses++;
    return false;
  }

  /** Cache metrics — surfaced in AggressiveSolverView metadata panel. */
  get stats() {
    return {
      hits:   this._hits,
      misses: this._misses,
      size:   this._visited.size,
    };
  }

  reset() {
    this._visited.clear();
    this._hits   = 0;
    this._misses = 0;
  }
}
