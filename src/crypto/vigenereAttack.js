import { chiSquared, ic } from "./analysis.js";
import { caesarDec } from "./caesar.js";
import { vigDec } from "./vigenere.js";

// ─── GCD helper ───────────────────────────────────────────────────────────────

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

// ─── Kasiski Test ─────────────────────────────────────────────────────────────
// Find repeated trigrams/quadgrams and measure distances between them.
// Key length candidates are common factors of those distances.

export function kasiskiTest(ciphertext) {
  const clean = ciphertext.toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length < 20) return [];

  // Find all repeated n-grams (n=3 and n=4 for better signal)
  const seen = {};
  for (let n = 3; n <= 4; n++) {
    for (let i = 0; i <= clean.length - n; i++) {
      const gram = clean.slice(i, i + n);
      if (!seen[gram]) seen[gram] = [];
      seen[gram].push(i);
    }
  }

  // Collect all pairwise distances for repeated grams
  const distances = [];
  for (const [, positions] of Object.entries(seen)) {
    if (positions.length < 2) continue;
    for (let i = 1; i < positions.length; i++) {
      distances.push(positions[i] - positions[i - 1]);
    }
  }

  if (!distances.length) return [];

  // Count factor occurrences for each distance
  const factorCounts = {};
  for (const d of distances) {
    for (let f = 2; f <= Math.min(d, 30); f++) {
      if (d % f === 0) factorCounts[f] = (factorCounts[f] || 0) + 1;
    }
  }

  return Object.entries(factorCounts)
    .map(([len, count]) => ({ len: Number(len), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// ─── IC-based Key Length Confirmation ────────────────────────────────────────
// For a given key length, compute average IC across columns.
// English IC ≈ 0.065; random ≈ 0.038.

export function columnIC(ciphertext, keyLen) {
  const clean = ciphertext.toLowerCase().replace(/[^a-z]/g, "");
  let total = 0;
  for (let col = 0; col < keyLen; col++) {
    const column = clean.split("").filter((_, i) => i % keyLen === col).join("");
    total += parseFloat(ic(column));
  }
  return (total / keyLen).toFixed(4);
}

// ─── Crack Single Column via Chi-Squared ─────────────────────────────────────

function crackColumn(columnText) {
  let bestShift = 0, bestChi = Infinity;
  for (let s = 0; s < 26; s++) {
    const chi = chiSquared(caesarDec(columnText, s));
    if (chi < bestChi) { bestChi = chi; bestShift = s; }
  }
  return { shift: bestShift, chi: bestChi.toFixed(2) };
}

// ─── Full Vigenère Auto-Crack ─────────────────────────────────────────────────

export function crackVigenere(ciphertext) {
  const clean = ciphertext.toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length < 30) return { error: "Need at least 30 letters for reliable analysis." };

  // Get key length candidates from Kasiski + IC analysis
  const kasinski = kasiskiTest(ciphertext);

  // Build a ranked list of key lengths: combine Kasiski vote + IC signal
  const maxLen = Math.min(20, Math.floor(clean.length / 4));
  const candidates = [];
  for (let kl = 2; kl <= maxLen; kl++) {
    const avgIC = parseFloat(columnIC(ciphertext, kl));
    const kasVotes = kasinski.find(k => k.len === kl)?.count ?? 0;
    // Higher IC (closer to 0.065) and more Kasiski votes = better candidate
    const icScore = avgIC; // higher is better
    candidates.push({ keyLen: kl, avgIC, kasVotes, icScore });
  }

  // Sort by IC score descending (closest to 0.065 for English)
  candidates.sort((a, b) => b.icScore - a.icScore);
  const topCandidates = candidates.slice(0, 5);

  const results = [];
  for (const { keyLen, avgIC, kasVotes } of topCandidates) {
    // Crack each column
    const columns = Array.from({ length: keyLen }, (_, col) =>
      clean.split("").filter((_, i) => i % keyLen === col).join("")
    );
    const crackedCols = columns.map(crackColumn);
    const key = crackedCols.map(c => String.fromCharCode(65 + c.shift)).join("");

    // Decrypt using recovered key
    const decrypted = vigDec(ciphertext, key);

    results.push({
      keyLen,
      key,
      avgIC,
      kasVotes,
      decrypted,
      columnDetails: crackedCols.map((c, i) => ({
        col: i,
        keyChar: String.fromCharCode(65 + c.shift),
        chi: c.chi,
      })),
    });
  }

  return { results, kasinski, totalLetters: clean.length };
}
