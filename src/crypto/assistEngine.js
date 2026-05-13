/**
 * assistEngine.js — Deterministic intelligence layer for CryptoKit Assist Mode
 *
 * RULES:
 *  - No external API calls
 *  - No LLM calls
 *  - Pure heuristics + scoring signals
 *  - Everything is deterministic and fast
 */

// ─── Transform explanations for Learn Mode ────────────────────────────────────

export const TRANSFORM_EXPLANATIONS = {
  base64: {
    what: "Base64 encoding",
    why:  "Base64 converts binary data into 64 printable ASCII characters (A-Z, a-z, 0-9, +, /). It is used to safely transmit binary over text-only channels like email or URLs.",
    signal: "Valid charset (A-Z a-z 0-9 + / =), length divisible by 4, padding with = signs.",
    ctf:  "Very common in CTF — often wraps flags or other encodings as layers.",
  },
  "base64url": {
    what: "Base64-URL encoding",
    why:  "Like Base64 but uses - and _ instead of + and / so it is safe in URLs and filenames. Common in JWTs and OAuth tokens.",
    signal: "Uses - and _ characters instead of + and /.",
    ctf:  "Seen in JWT headers and cookie values.",
  },
  hex: {
    what: "Hexadecimal (hex) encoding",
    why:  "Every byte is represented as two hex digits (0-9, a-f). 256 possible values per byte maps to 00–ff.",
    signal: "Even length, only hex digits (0-9, a-f), sometimes colon-separated.",
    ctf:  "Often used to encode binary output of ciphers or hash functions.",
  },
  rot13: {
    what: "ROT-13 substitution",
    why:  "Each letter is rotated 13 positions in the alphabet. Because the alphabet has 26 letters, ROT-13 is its own inverse — encoding and decoding are the same operation.",
    signal: "Printable text that looks almost like English but with wrong letters.",
    ctf:  "Simple obfuscation — decode = encode. Extremely common in beginner CTFs.",
  },
  "rot-13": {
    what: "ROT-13 substitution",
    why:  "Each letter is rotated 13 positions in the alphabet. Because the alphabet has 26 letters, ROT-13 is its own inverse — encoding and decoding are the same operation.",
    signal: "Printable text that looks almost like English but with wrong letters.",
    ctf:  "Simple obfuscation — decode = encode. Extremely common in beginner CTFs.",
  },
  caesar: {
    what: "Caesar cipher",
    why:  "A shift cipher where each letter is moved N positions forward in the alphabet. Julius Caesar used a shift of 3. The key is the shift amount (0-25).",
    signal: "Printable text with consistent offset from English letter distribution.",
    ctf:  "Try all 26 shifts with Caesar Brute Force. Often shift-3 or shift-13.",
  },
  url: {
    what: "URL encoding (percent-encoding)",
    why:  "Special characters are replaced by % followed by their hex code. Space becomes %20, { becomes %7B, } becomes %7D. Required for safe inclusion in URLs.",
    signal: "Contains %XX sequences where XX are hex digits.",
    ctf:  "Flags are often URL-encoded to hide braces and special characters.",
  },
  "url-decode": {
    what: "URL encoding (percent-encoding)",
    why:  "Special characters are replaced by % followed by their hex code. Space becomes %20, { becomes %7B, } becomes %7D.",
    signal: "Contains %XX sequences where XX are hex digits.",
    ctf:  "Flags are often URL-encoded to hide braces and special characters.",
  },
  binary: {
    what: "Binary (base-2) encoding",
    why:  "Each character is represented as 8 bits (0s and 1s). The letter 'A' is 01000001, 'a' is 01100001. Groups of 8 bits are converted to their ASCII value.",
    signal: "Only 0 and 1 characters, length divisible by 8.",
    ctf:  "Sometimes spaces separate bytes, sometimes not.",
  },
  morse: {
    what: "Morse code",
    why:  "International Morse Code encodes letters as sequences of dots (.) and dashes (-). Letters are separated by spaces, words by / or longer gaps.",
    signal: "Only . - / and space characters.",
    ctf:  "Dots and dashes — decode with spaces as letter separators and / as word separators.",
  },
  reverse: {
    what: "String reversal",
    why:  "The entire input string is reversed character-by-character. The last character becomes the first. Simple obfuscation that is trivially undone.",
    signal: "Text that makes sense when read backwards.",
    ctf:  "Often combined with other encodings as a first or last layer.",
  },
  xor: {
    what: "XOR cipher",
    why:  "Each byte of the plaintext is XOR'd with a key byte. XOR is symmetric: encrypt(encrypt(x)) = x. With a single-byte key, brute-force is only 256 attempts.",
    signal: "High entropy bytes with some structure; not valid text or encoding.",
    ctf:  "Use XOR Analyzer → Brute Force tab. Flag patterns will surface as the top result.",
  },
  "base32": {
    what: "Base32 encoding",
    why:  "Like Base64 but uses 32 characters (A-Z and 2-7). More compact than hex, safer than Base64 for case-insensitive systems. Used in TOTP codes and some file systems.",
    signal: "Uppercase A-Z and digits 2-7 only, length divisible by 8, = padding.",
    ctf:  "Less common than Base64 but appears in multi-layer challenges.",
  },
  jwt: {
    what: "JSON Web Token (JWT)",
    why:  "Three Base64-URL segments separated by dots: header.payload.signature. The header and payload are JSON, the signature verifies authenticity.",
    signal: "Three dot-separated Base64-URL segments. Header usually decodes to {\"alg\":...}.",
    ctf:  "Try alg:none attack or check if HS256 secret is weak (JWT Inspector).",
  },
  hash: {
    what: "Cryptographic hash",
    why:  "A one-way function that maps arbitrary data to a fixed-length digest. MD5=32 hex, SHA1=40 hex, SHA256=64 hex. Cannot be reversed — only cracked with dictionary/rainbow tables.",
    signal: "Fixed-length all-hex string. MD5: 32, SHA1: 40, SHA256: 64, SHA512: 128.",
    ctf:  "Run a dictionary attack in Hash Analyzer. Many CTF hashes use weak passwords.",
  },
  vigenère: {
    what: "Vigenère cipher",
    why:  "A polyalphabetic substitution cipher using a keyword. Each letter of the plaintext is shifted by the corresponding letter of the key (repeated cyclically).",
    signal: "English-like distribution but IC ≈ 0.045 instead of 0.067.",
    ctf:  "Kasiski examination or IC analysis reveals the key length. Then solve each Caesar shift.",
  },
  atbash: {
    what: "Atbash cipher",
    why:  "Hebrew substitution cipher where A↔Z, B↔Y, C↔X, etc. Each letter maps to its mirror in the alphabet. Like ROT-13 but with a different mapping.",
    signal: "Printable text with reversed alphabet distribution.",
    ctf:  "Rare but appears in classical cipher challenges.",
  },
};

// ─── Suggestion rules ─────────────────────────────────────────────────────────
//
// Each rule: { match, suggestions[] }
//   match(output, sr, label) → boolean
//   suggestion: { action, why, confidence, opId, toolRoute }

const SUGGESTION_RULES = [
  // Immediately flag a plain-English identity (no encoding)
  {
    match: (output, sr) => sr.wordScore >= 60 && sr.printableRatio >= 0.95 && sr.entropyDelta <= 0,
    suggestions: [{
      action: "Output appears to be readable English — no further decoding likely needed",
      why: "High English word score and fully printable output with no entropy reduction signal that this is already plaintext.",
      confidence: 90,
      opId: null,
      toolRoute: null,
    }],
  },

  // Base64 output that is also Base64 (nested)
  {
    match: (output, _sr, label) => {
      const t = output?.trim() ?? "";
      return label?.toLowerCase().includes("base64") &&
             /^[A-Za-z0-9+/\-_]+=*$/.test(t) && t.length % 4 === 0 && t.length >= 8;
    },
    suggestions: [{
      action: "Output is also Base64 — decode again (multi-layer)",
      why: "The decoded output still matches the Base64 alphabet with correct length divisibility. This is a double-encoded input — paste the output back into Quick Scan.",
      confidence: 88,
      opId: "b64dec",
      toolRoute: "Quick Scan",
    }],
  },

  // Hex-looking output
  {
    match: (output) => {
      const t = output?.replace(/[\s:]/g, "") ?? "";
      return /^[0-9a-fA-F]+$/.test(t) && t.length % 2 === 0 && t.length >= 6;
    },
    suggestions: [{
      action: "Output looks like hex — try Hex → ASCII decode",
      why: "The output contains only hex characters (0-9, a-f) with even length. It may encode another layer of text.",
      confidence: 78,
      opId: "hexdec",
      toolRoute: "Quick Scan",
    }],
  },

  // Binary-looking output
  {
    match: (output) => {
      const t = output?.replace(/\s/g, "") ?? "";
      return /^[01]+$/.test(t) && t.length % 8 === 0 && t.length >= 8;
    },
    suggestions: [{
      action: "Output looks like binary — convert 8-bit groups to ASCII",
      why: "Only 0 and 1 characters, length divisible by 8. Each group of 8 bits represents one ASCII character.",
      confidence: 82,
      opId: "bintoasc",
      toolRoute: "Quick Scan",
    }],
  },

  // URL-encoded output
  {
    match: (output) => /%[0-9a-fA-F]{2}/.test(output ?? ""),
    suggestions: [{
      action: "Output contains URL-encoded sequences — apply URL decode",
      why: "The %XX pattern indicates percent-encoding. Decoding will replace these with their actual characters.",
      confidence: 85,
      opId: "urldec",
      toolRoute: "Quick Scan",
    }],
  },

  // Low entropy output (possible XOR residue or compressed)
  {
    match: (_output, sr) => sr.printableRatio < 0.5 && sr.entropyDelta < 0,
    suggestions: [
      {
        action: "High non-printable ratio — try single-byte XOR brute force",
        why: "Many non-printable bytes suggest XOR encryption with an unknown single-byte key. The XOR Analyzer will try all 256 keys and rank by English likelihood.",
        confidence: 55,
        opId: null,
        toolRoute: "XOR Analyzer → Brute Force",
      },
    ],
  },

  // High entropy, good printable — might be Vigenère or Caesar
  {
    match: (_output, sr) => sr.printableRatio >= 0.9 && sr.wordScore < 20 && sr.chiScore < 40,
    suggestions: [
      {
        action: "High printable but low word score — try Caesar brute force (all 26 shifts)",
        why: "The output is readable ASCII but doesn't resemble English. A Caesar or ROT cipher shifts all letters by a constant. Brute force reveals the correct shift.",
        confidence: 60,
        opId: "rot13",
        toolRoute: "Cryptanalysis → Caesar BF",
      },
      {
        action: "Alternatively — try Vigenère analysis (Kasiski + IC)",
        why: "Vigenère uses a repeating keyword. IC (Index of Coincidence) near 0.045 instead of 0.067 is a strong signal. Kasiski examination reveals key length.",
        confidence: 45,
        opId: null,
        toolRoute: "Cryptanalysis → Vigenère Crack",
      },
    ],
  },

  // Morse-like output after decode
  {
    match: (output) => /^[. /\-]+$/.test((output ?? "").trim()) &&
      (output ?? "").includes(".") && (output ?? "").includes("-"),
    suggestions: [{
      action: "Output looks like Morse code — decode dots and dashes",
      why: "Only . - and space characters. Morse code uses dots for short signals, dashes for long. Spaces separate letters, / separates words.",
      confidence: 80,
      opId: null,
      toolRoute: "Quick Scan (Morse)",
    }],
  },

  // ROT-13 on ROT-13 (printable but still not English)
  {
    match: (_output, sr, label) =>
      label?.toLowerCase().includes("rot") &&
      sr.printableRatio >= 0.9 && sr.wordScore < 30,
    suggestions: [{
      action: "Still not English after ROT-13 — try Caesar with other shifts",
      why: "ROT-13 is shift-13. If the result isn't English, the cipher may use a different shift (1–25). Caesar Brute Force will identify the correct offset.",
      confidence: 55,
      opId: null,
      toolRoute: "Cryptanalysis → Caesar BF",
    }],
  },

  // Good result — paste back hint
  {
    match: (_output, sr) => sr.printableRatio >= 0.8 && sr.wordScore >= 20 && sr.entropyDelta > 0.3,
    suggestions: [{
      action: "Paste this output back into Quick Scan to check for additional encoding layers",
      why: "The output is readable but may have further layers. Multi-layer CTF challenges often use Base64 → Hex → ROT-13 or similar chains. Quick Scan handles this automatically.",
      confidence: 70,
      opId: null,
      toolRoute: "Quick Scan",
    }],
  },
];

/**
 * Build 1–2 next-step suggestions for a decoded result.
 * Pure heuristics — no API calls.
 *
 * @param {string}   output          - decoded output text
 * @param {object}   sr              - scoreReport from scoreBreakdown()
 * @param {string}   label           - transform label ("Base64 Decode", etc.)
 * @param {RegExp}   flagRe          - flag regex
 * @param {Set<string>} [triedOps]   - opIds already attempted (session memory)
 * @returns {{ action:string, why:string, confidence:number, tier:string, opId:string|null, toolRoute:string|null }[]}
 */
export function buildSuggestions(output, sr, label, flagRe, triedOps = new Set()) {
  // If a flag is found, no further suggestions needed
  if (flagRe?.test(output ?? "")) return [];

  const matched = [];
  const seenActions = new Set();

  for (const rule of SUGGESTION_RULES) {
    if (rule.match(output ?? "", sr, label ?? "")) {
      for (const s of rule.suggestions) {
        // Skip if this opId was already tried this session
        if (s.opId && triedOps.has(s.opId)) continue;
        // Skip redundant actions
        if (seenActions.has(s.action)) continue;
        seenActions.add(s.action);
        matched.push({
          ...s,
          tier: s.confidence >= 80 ? "High" : s.confidence >= 55 ? "Medium" : "Low",
        });
        if (matched.length >= 2) break;
      }
    }
    if (matched.length >= 2) break;
  }
  return matched.slice(0, 2);
}

// ─── Confidence verdict ───────────────────────────────────────────────────────

/**
 * Convert a numeric confidence into a human-readable verdict + guidance.
 * Tiers match spec exactly: ≥85 / 70-84 / 55-69 / 35-54 / <35
 */
export function assessConfidenceVerdict(conf) {
  if (conf >= 85) return {
    verdict: "Highly likely correct",
    tier:    "high",
    detail:  "Strong English signal, low entropy, and/or flag pattern detected.",
    icon: "✅",
  };
  if (conf >= 70) return {
    verdict: "Strong candidate",
    tier:    "high",
    detail:  "Good signal — verify the output makes semantic sense in context.",
    icon: "🟢",
  };
  if (conf >= 55) return {
    verdict: "Possible — verify manually",
    tier:    "medium",
    detail:  "Moderate signal. Output may need further transformation.",
    icon: "🟡",
  };
  if (conf >= 35) return {
    verdict: "Weak signal",
    tier:    "low",
    detail:  "Low confidence. Try other transforms or Deep Scan.",
    icon: "🟠",
  };
  return {
    verdict: "Likely incorrect",
    tier:    "low",
    detail:  "Output probably does not contain meaningful plaintext.",
    icon: "🔴",
  };
}

/**
 * Assess how trustworthy a detected flag is.
 *
 * HIGH   — known CTF prefix + readable alphanumeric body
 * MEDIUM — prefix match but body contains unusual characters
 * LOW    — matched only via custom regex (non-standard prefix)
 *
 * @param {string} flag     - the full flag string e.g. "flag{abc123}"
 * @param {RegExp} flagRe   - the regex used to detect it
 * @returns {{ level:"HIGH"|"MEDIUM"|"LOW", label:string, detail:string }}
 */
export function assessFlagConfidence(flag, flagRe) {
  const KNOWN_PREFIXES = /^(flag|ctf|htb|picoctf|pico|ovrd|hack)\{/i;
  const hasKnownPrefix = KNOWN_PREFIXES.test(flag);
  const body = flag.replace(/^[^{]+\{/, "").replace(/\}$/, "");
  const bodyReadable = /^[a-zA-Z0-9_\-. !@#$%^&*()+=[\]{}|\\;:'",<>?/`~ ]+$/.test(body);
  const bodyClean    = /^[a-zA-Z0-9_\-]+$/.test(body);

  if (hasKnownPrefix && bodyClean) {
    return { level: "HIGH", label: "HIGH confidence", detail: "Known prefix with clean alphanumeric body." };
  }
  if (hasKnownPrefix && bodyReadable) {
    return { level: "MEDIUM", label: "MEDIUM confidence", detail: "Known prefix — body contains special characters." };
  }
  if (hasKnownPrefix) {
    return { level: "MEDIUM", label: "MEDIUM confidence", detail: "Known prefix detected but body has unusual characters." };
  }
  return { level: "LOW", label: "LOW confidence", detail: "Matched via custom or non-standard flag pattern." };
}

// ─── Pipeline auto-build ──────────────────────────────────────────────────────

// Label → pipeline opId mapping (mirrors PipelineView OPS_MAP)
const LABEL_TO_OP = [
  ["base64url",  "b64dec"],
  ["base64",     "b64dec"],
  ["hex",        "hexdec"],
  ["url-decode", "urldec"],
  ["url",        "urldec"],
  ["binary",     "bintoasc"],
  ["rot-13",     "rot13"],
  ["rot13",      "rot13"],
  ["reverse",    "reverse"],
  ["caesar",     "caesardec"],
  ["base32",     "b32dec"],
  ["vigenère",   null],
  ["vigenere",   null],
  ["xor",        null],
  ["morse",      null],
];

function labelToOpId(label) {
  const lc = (label ?? "").toLowerCase();
  for (const [key, op] of LABEL_TO_OP) if (lc.includes(key)) return op;
  return null;
}

/**
 * Build a pipeline preview from a multi-step result chain.
 * Returns an array of { opId, label, param } for display + one-click apply.
 *
 * @param {object} result - result object with stepsWithIds or steps[]
 * @returns {{ opId:string|null, label:string, param?:string, canAutoApply:boolean }[]}
 */
export function buildPipelinePreview(result) {
  if (!result) return [];

  // Prefer stepsWithIds (from aggressiveSolve) — most accurate
  if (result.stepsWithIds?.length) {
    return result.stepsWithIds.map(s => {
      const opId = s.toolId?.includes(".") ? null : (s.toolId ?? labelToOpId(s.label));
      const resolvedOpId = opId ?? labelToOpId(s.label);
      return {
        opId:         resolvedOpId,
        label:        s.label ?? s.toolId ?? "?",
        param:        s.params ? JSON.stringify(s.params) : undefined,
        canAutoApply: !!resolvedOpId,
      };
    });
  }

  // Fallback: steps[] (from autoSolve)
  if (result.steps?.length) {
    return result.steps.map(label => ({
      opId:         labelToOpId(label),
      label,
      canAutoApply: !!labelToOpId(label),
    }));
  }

  // Single-step result
  const opId = labelToOpId(result.label ?? "");
  if (!opId && !result.label) return [];
  return [{
    opId,
    label:        result.label ?? "?",
    canAutoApply: !!opId,
  }];
}

/**
 * Convert a pipeline preview back into pipeline ops for onSendToPipeline.
 */
export function previewToPipelineOps(preview) {
  return preview
    .filter(s => s.canAutoApply && s.opId)
    .map(s => ({ tool: s.opId, param: s.param }));
}

// ─── Pipeline step reasoning ──────────────────────────────────────────────────

const STEP_REASONS = {
  b64dec:    "Detected valid Base64 charset (A-Z a-z 0-9 + /) with correct length and padding",
  b64enc:    "Encoding output as Base64 for safe ASCII transmission",
  hexdec:    "Detected even-length hex string (0-9, a-f) — each pair is one ASCII byte",
  hexenc:    "Converting each byte to its two-digit hex representation",
  urldec:    "Detected %XX percent-encoding sequences in input",
  urlenc:    "URL-encoding special characters for safe URL inclusion",
  bintoasc:  "Detected binary string (0s and 1s) with length divisible by 8",
  asctobin:  "Converting each character to its 8-bit binary representation",
  rot13:     "Alphabetic substitution detected — each letter shifted 13 positions",
  caesar:    "Shift cipher — letters offset by constant amount from English frequency",
  caesardec: "Reversing Caesar shift — letter frequency analysis identified offset",
  xorkey:    "XOR cipher with known key — symmetric operation",
  xordec:    "XOR decryption — XOR with key to recover plaintext",
  reverse:   "String reversal — input reads correctly in reverse order",
  b32dec:    "Detected Base32 charset (A-Z, 2-7) with length divisible by 8",
  b32enc:    "Encoding as Base32 for case-insensitive ASCII transmission",
};

/**
 * Get the detection reason for a pipeline step opId.
 */
export function getStepReason(opId) {
  return STEP_REASONS[opId] ?? null;
}

// ─── CTF hint system ──────────────────────────────────────────────────────────

/**
 * Return a contextual CTF hint when the solver is struggling.
 * Called when results are weak or empty.
 *
 * @param {string} input   - raw user input
 * @param {object[]} results - array of result objects (may be empty)
 * @returns {{ title:string, body:string, suggestions:string[] } | null}
 */
export function getHint(input, results) {
  const t = (input ?? "").trim();
  if (!t) return null;

  const allLow   = results?.length > 0 && results.every(r => (r.confidence ?? 0) < 40);
  const empty    = !results || results.length === 0;

  // High entropy — likely encrypted or key material
  const bytes    = Array.from(t).map(c => c.charCodeAt(0));
  const freq     = new Array(256).fill(0);
  bytes.forEach(b => freq[b]++);
  const H = bytes.length > 0
    ? -freq.reduce((s, f) => f > 0 ? s + (f/bytes.length) * Math.log2(f/bytes.length) : s, 0)
    : 0;

  if (!empty && !allLow) return null; // Only hint when struggling

  // Specific input patterns → targeted hints
  if (/^[A-Za-z0-9+/=]+$/.test(t) && t.length % 4 === 0 && t.length >= 8) {
    return {
      title: "Looks like Base64",
      body:  "The input uses the Base64 alphabet (A-Z, a-z, 0-9, +, /) and has length divisible by 4. Try Base64 decode first.",
      suggestions: ["Quick Scan → Base64 decode", "Check for = padding at end"],
    };
  }

  if (/^[0-9a-fA-F\s]+$/.test(t) && t.replace(/\s/g,"").length % 2 === 0) {
    return {
      title: "Looks like Hex encoding",
      body:  "Only hex characters (0-9, a-f). Convert to ASCII — each pair of hex digits is one byte.",
      suggestions: ["Quick Scan → Hex decode", "Try XOR Analyzer if hex decode gives garbage"],
    };
  }

  if (/^[01\s]+$/.test(t) && t.replace(/\s/g,"").length % 8 === 0) {
    return {
      title: "Looks like Binary",
      body:  "Only 0 and 1 characters with length divisible by 8. Each group of 8 bits encodes one ASCII character.",
      suggestions: ["Quick Scan → Binary decode"],
    };
  }

  if (/^[. /-]+$/.test(t) && t.includes(".") && t.includes("-")) {
    return {
      title: "Looks like Morse code",
      body:  "Dots (.) and dashes (-) are the Morse alphabet. Spaces separate letters, / separates words.",
      suggestions: ["Quick Scan → Morse decode"],
    };
  }

  if (H > 7.2) {
    return {
      title: "Very high entropy — likely encrypted",
      body:  "Shannon entropy above 7.2 bits/byte is near-random. Encoding (Base64, Hex) produces structured output with lower entropy. This may be AES, XOR, or compressed data.",
      suggestions: [
        "Check if you have a key or IV",
        "If binary/hex: try XOR Analyzer → Brute Force",
        "Look for hints in challenge description about cipher type",
      ],
    };
  }

  if (H < 2.5 && t.length > 10) {
    return {
      title: "Very low entropy — highly repetitive",
      body:  "Low entropy means few unique characters. This could be Morse, binary, or a simple substitution cipher.",
      suggestions: [
        "Check if it contains only specific character sets",
        "Try Caesar Brute Force",
        "Look for Base32 (A-Z, 2-7)",
      ],
    };
  }

  // Printable but not English
  const printable = bytes.filter(b => b >= 32 && b < 127).length / bytes.length;
  if (printable >= 0.9 && t.length > 6) {
    return {
      title: "Printable ASCII but not readable English",
      body:  "The input uses visible characters but doesn't resemble English text. This is consistent with a substitution cipher (ROT, Caesar, Vigenère, Atbash) or a transposition.",
      suggestions: [
        "Try Caesar Brute Force — all 26 shifts take one second",
        "If length is long: check IC for Vigenère",
        "Atbash: A→Z, B→Y mirror cipher",
      ],
    };
  }

  // Generic fall-through
  return {
    title: "This looks like layered encoding",
    body:  "CTF challenges often stack multiple encodings. The solver could not identify a single dominant type. Try Deep Scan to explore multi-step chains automatically.",
    suggestions: [
      "Use Deep Scan (Aggressive mode)",
      "Try building steps manually in Pipeline",
      "Use XOR Analyzer if you suspect XOR encryption",
    ],
  };
}

// ─── Failure advice ───────────────────────────────────────────────────────────

/**
 * Produce structured failure advice when no high-confidence result exists.
 *
 * @param {string} input
 * @param {object[]} results
 * @returns {{ reason:string, tools:{ name:string, route:string, why:string }[] }}
 */
export function getFailureAdvice(input, results) {
  const t = (input ?? "").trim();
  const allLow = results?.every(r => (r.confidence ?? 0) < 40);

  const tools = [];

  // Always offer Deep Scan if Quick Scan was used
  tools.push({
    name:  "Deep Scan",
    route: "Smart Solver → Deep Scan",
    why:   "Beam search across up to 5 decode layers. Finds multi-layer encodings Quick Scan misses.",
  });

  // XOR suggestion based on non-printable ratio
  const nonPrint = Array.from(t).filter(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126).length;
  if (nonPrint / t.length > 0.2) {
    tools.push({
      name:  "XOR Analyzer → Brute Force",
      route: "XOR Analyzer → Brute Force tab",
      why:   "High non-printable byte ratio suggests XOR encryption. Brute-forces all 256 single-byte keys.",
    });
  }

  // Caesar if printable but not English
  const printable = Array.from(t).filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127).length;
  if (printable / t.length >= 0.85) {
    tools.push({
      name:  "Cryptanalysis → Caesar BF",
      route: "Cryptanalysis → Caesar BF",
      why:   "Fully printable but not readable — shift cipher likely. 26 shifts evaluated instantly.",
    });
  }

  // Pipeline suggestion — manual composition
  tools.push({
    name:  "Manual Pipeline",
    route: "Pipeline",
    why:   "Build a custom decode chain step-by-step. Useful when you have partial knowledge of the encoding scheme.",
  });

  const reason = allLow
    ? "No transformation produced a high-confidence result. The encoding type may be uncommon, the input may be encrypted (not just encoded), or this may require additional context."
    : "No results found. The input may be too short, already plaintext, or use an unsupported encoding.";

  return { reason, tools };
}
