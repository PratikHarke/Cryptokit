// ─── Shannon Entropy ──────────────────────────────────────────────────────────
// H = -Σ p(x) * log2(p(x))

export function shannonEntropy(bytes) {
  if (!bytes.length) return 0;
  const freq = new Map();
  for (const b of bytes) freq.set(b, (freq.get(b) || 0) + 1);
  let H = 0;
  for (const count of freq.values()) {
    const p = count / bytes.length;
    H -= p * Math.log2(p);
  }
  return H; // 0 = uniform/constant, 8 = fully random
}

// ─── Sliding-Window Entropy ───────────────────────────────────────────────────
// Compute entropy for each overlapping window of `windowSize` bytes.
// Returns array of { offset, entropy, label }

export function slidingWindowEntropy(bytes, windowSize = 64) {
  const results = [];
  for (let i = 0; i < bytes.length; i += Math.max(1, Math.floor(windowSize / 4))) {
    const slice = bytes.slice(i, i + windowSize);
    const H = shannonEntropy(slice);
    results.push({ offset: i, entropy: H, window: Math.min(windowSize, bytes.length - i) });
  }
  return results;
}

// ─── Byte Frequency Table ─────────────────────────────────────────────────────

export function byteFrequency(bytes) {
  const freq = new Array(256).fill(0);
  for (const b of bytes) freq[b]++;
  return freq;
}

// ─── Classify entropy region ──────────────────────────────────────────────────

export function classifyEntropy(h) {
  if (h < 1.0) return { label: "Uniform/constant",  color: "#3b82f6" };
  if (h < 3.5) return { label: "Structured text",   color: "#22c55e" };
  if (h < 5.5) return { label: "Compressed/encoded",color: "#f59e0b" };
  if (h < 7.0) return { label: "Likely encrypted",  color: "#f97316" };
  return            { label: "Max entropy (random)", color: "#ef4444" };
}

// ─── Parse input to bytes ─────────────────────────────────────────────────────

export function parseToBytes(input, mode) {
  const enc = new TextEncoder();
  if (mode === "text") return Array.from(enc.encode(input));
  if (mode === "hex") {
    const clean = input.replace(/\s+/g, "");
    if (!clean.match(/^[0-9a-fA-F]+$/) || clean.length % 2 !== 0) return null;
    return clean.match(/.{2}/g).map(h => parseInt(h, 16));
  }
  if (mode === "b64") {
    try {
      const bin = atob(input.trim());
      return Array.from(bin).map(c => c.charCodeAt(0));
    } catch { return null; }
  }
  return null;
}
