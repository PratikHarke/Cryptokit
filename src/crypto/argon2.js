// ─── Argon2 Analyzer ─────────────────────────────────────────────────────────
//
// Argon2 is a memory-hard KDF — NOT encryption. Cannot be reversed.
// This module: parse, generate, verify (re-hash approach), dictionary attack.
//
// IMPORTANT — CJS/UMD interop:
//   When Vite bundles argon2-bundled.min.js and the code calls
//   import("argon2-browser"), the result is a namespace wrapper:
//     { default: { hash, verify, ... }, argon2: { ... } }
//   The API lives on .default, NOT at the top level.

let _argon2 = null;

async function getArgon2() {
  if (_argon2) return _argon2;
  const mod = await import("argon2-browser");
  const api = mod.default ?? mod;
  if (typeof api?.hash !== "function") {
    throw new Error(
      `argon2-browser interop failed — api.hash is ${typeof api?.hash}. ` +
      `Top-level keys: ${Object.keys(mod).join(", ")}`
    );
  }
  _argon2 = api;
  console.debug("[Argon2] loaded. api.hash:", typeof api.hash, "api.verify:", typeof api.verify);
  return _argon2;
}

// ─── PHC regex ────────────────────────────────────────────────────────────────
// Base64 chars in PHC: A-Z a-z 0-9 + / (standard, no padding)
// We also allow = (some variants pad), . and - (PHC spec)
const PHC_REGEX =
  /^\$(argon2(?:id|i|d))\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/._=|-]+)\$([A-Za-z0-9+/._=|-]+)$/;

export function parseArgon2Hash(hash) {
  if (typeof hash !== "string" || !hash.trim())
    return { error: "Input is empty." };
  const m = hash.trim().match(PHC_REGEX);
  if (!m)
    return { error: "Not a valid Argon2 PHC string.\nExpected: $argon2id$v=19$m=65536,t=3,p=1$<salt>$<hash>" };
  return {
    variant: m[1], version: parseInt(m[2], 10),
    m: parseInt(m[3], 10), t: parseInt(m[4], 10), p: parseInt(m[5], 10),
    salt: m[6], hash: m[7], raw: hash.trim(),
  };
}

// ─── Base64 helpers ───────────────────────────────────────────────────────────
// argon2 C library uses standard base64 (+ /) WITHOUT padding.

function phcBase64ToBytes(b64) {
  // Normalise URL-safe → standard, then re-pad to multiple of 4
  const std    = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = std + "=".repeat((4 - (std.length % 4)) % 4);
  try {
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch (e) {
    throw new Error(`base64 decode failed for "${b64.slice(0,20)}…": ${e.message}`);
  }
}

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function variantToId(variant) {
  // argon2d=0, argon2i=1, argon2id=2 (matches ArgonType in argon2-browser)
  return { argon2d: 0, argon2i: 1, argon2id: 2 }[variant] ?? 2;
}

// ─── Generate ─────────────────────────────────────────────────────────────────
export async function generateArgon2Hash(password, options = {}) {
  if (!password) return { error: "Password is required." };
  const variant = options.variant ?? "argon2id";
  const m       = options.m       ?? 65536;
  const t       = options.t       ?? 3;
  const p       = options.p       ?? 1;
  const hashLen = options.hashLen ?? 32;
  try {
    const argon2 = await getArgon2();
    const salt   = crypto.getRandomValues(new Uint8Array(16));
    const result = await argon2.hash({
      pass: password, salt,
      time: t, mem: m, parallelism: p, hashLen,
      type: variantToId(variant),
    });
    if (!result?.encoded)
      return { error: "argon2.hash() returned no encoded string." };
    console.debug("[Argon2] generated:", result.encoded.slice(0, 60));
    return { encoded: result.encoded, hex: result.hashHex, params: { variant, m, t, p, hashLen } };
  } catch (err) {
    console.error("[Argon2] generateArgon2Hash error:", err);
    return { error: `Argon2 error: ${err?.message ?? String(err)}` };
  }
}

// ─── Verify ───────────────────────────────────────────────────────────────────
//
// Strategy — TWO passes:
//
// Pass 1: argon2.verify({ pass, encoded })
//   • Returns undefined on SUCCESS
//   • Throws { message, code } on wrong password (code == -35)
//   • Throws something else on bad PHC / WASM error
//   This is the simplest and most reliable approach.
//
// Pass 2 (fallback): parse PHC → decode salt bytes → re-run argon2.hash() →
//   compare hashHex.  Used if Pass 1 throws an unexpected error.
//
// Requirement §3: never modify $, +, /, = in the PHC string.

export async function verifyArgon2Password(password, encodedHash) {
  if (!password)    return { error: "Password is required." };
  if (!encodedHash) return { error: "Encoded hash is required." };

  const phc = encodedHash.trim();

  // Validate format first so we can give a useful error before touching WASM
  const parsed = parseArgon2Hash(phc);
  if (parsed.error) return { error: parsed.error };

  let argon2;
  try { argon2 = await getArgon2(); }
  catch (e) { return { error: `argon2-browser failed to load: ${e.message}` }; }

  // ── Pass 1: argon2.verify() ───────────────────────────────────────────────
  let pass1Error = null;
  try {
    // verify() returns undefined on success, throws on any failure
    await argon2.verify({ pass: password, encoded: phc });
    // No throw = password matches
    console.debug("[Argon2] verify(): MATCH");
    return { match: true };
  } catch (err) {
    const msg = err?.message ?? String(err);
    const code = err?.code ?? null;
    console.debug("[Argon2] verify() threw:", { msg, code });

    // code -35 = ARGON2_VERIFY_MISMATCH = expected "wrong password" result
    // message "does not match" = same thing (text from C library)
    if (code === -35 || msg.toLowerCase().includes("does not match")) {
      console.debug("[Argon2] verify(): NO MATCH (code -35)");
      return { match: false };
    }
    // Any other throw = unexpected WASM/interop error → try Pass 2
    pass1Error = msg;
    console.warn("[Argon2] verify() unexpected error — falling back to re-hash:", msg);
  }

  // ── Pass 2: re-hash fallback ─────────────────────────────────────────────
  let saltBytes, expectedHex, hashLen;
  try {
    saltBytes         = phcBase64ToBytes(parsed.salt);
    const expectedBytes = phcBase64ToBytes(parsed.hash);
    hashLen           = expectedBytes.length;
    expectedHex       = toHex(expectedBytes);
  } catch (e) {
    return {
      match: false,
      error: `Argon2 verification failed: PHC base64 decode error — ${e.message} ` +
             `(primary error was: ${pass1Error})`,
    };
  }

  try {
    const result = await argon2.hash({
      pass: password,
      salt: saltBytes,          // exact bytes extracted from PHC — no new salt
      time: parsed.t,
      mem:  parsed.m,
      parallelism: parsed.p,
      hashLen,
      type: variantToId(parsed.variant),
    });

    if (!result?.hashHex) {
      return { match: false, error: "argon2.hash() returned no hashHex during re-hash verify." };
    }

    const match = result.hashHex === expectedHex;
    console.debug(
      `[Argon2] re-hash verify: expected=${expectedHex.slice(0,16)}… ` +
      `got=${result.hashHex.slice(0,16)}… match=${match}`
    );
    return { match };
  } catch (err) {
    const msg = err?.message ?? String(err);
    console.error("[Argon2] re-hash fallback error:", err);
    return {
      match: false,
      error: `Argon2 verification failed: ${msg}`,
    };
  }
}

// ─── Dictionary attack ────────────────────────────────────────────────────────
// Re-hash approach — decode salt+expected-hex ONCE, then loop with argon2.hash().

export async function crackArgon2Dictionary(encodedHash, wordlist, options = {}) {
  const { onProgress, signal } = options;
  if (!encodedHash)                                      return { error: "Encoded hash is required." };
  if (!Array.isArray(wordlist) || !wordlist.length)      return { error: "Wordlist is empty." };

  const parsed = parseArgon2Hash(encodedHash.trim());
  if (parsed.error) return { error: parsed.error };

  let saltBytes, expectedHex, hashLen;
  try {
    saltBytes           = phcBase64ToBytes(parsed.salt);
    const expectedBytes = phcBase64ToBytes(parsed.hash);
    hashLen             = expectedBytes.length;
    expectedHex         = toHex(expectedBytes);
  } catch (e) { return { error: `PHC decode error: ${e.message}` }; }

  let argon2;
  try { argon2 = await getArgon2(); }
  catch (e) { return { error: `argon2-browser load error: ${e.message}` }; }

  const typeId = variantToId(parsed.variant);
  let tried = 0;

  for (const word of wordlist) {
    if (signal?.aborted) break;
    tried++;
    onProgress?.(tried, wordlist.length, word);

    try {
      const result = await argon2.hash({
        pass: word, salt: saltBytes,
        time: parsed.t, mem: parsed.m, parallelism: parsed.p,
        hashLen, type: typeId,
      });
      if (result?.hashHex === expectedHex) {
        console.debug(`[Argon2] dictionary: FOUND "${word}" at attempt ${tried}`);
        return { found: true, password: word, tried };
      }
    } catch (err) {
      console.error(`[Argon2] dictionary error on "${word}":`, err);
      return { error: `Argon2 error on "${word}": ${err?.message ?? err}` };
    }

    if (tried % 5 === 0) await new Promise(r => setTimeout(r, 0));
  }

  return { found: false, tried };
}
