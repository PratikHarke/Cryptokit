// ─── Hex Parser Helper ────────────────────────────────────────────────────────
// A single reusable parser that validates hex strings and returns Uint8Array.
// Use this wherever hex input is accepted to avoid silent bugs.

/**
 * Parse a hex string into a Uint8Array.
 *
 * Rules:
 *  - Strips all whitespace (spaces, newlines, tabs) before parsing.
 *  - Rejects empty strings.
 *  - Rejects strings containing non-hex characters.
 *  - Rejects odd-length hex strings (a valid byte sequence requires pairs).
 *
 * @param {string} hex — raw hex input from the user
 * @returns {{ bytes: Uint8Array } | { error: string }}
 */
export function parseHex(hex) {
  if (typeof hex !== "string") return { error: "Input must be a string." };

  // Strip all whitespace
  const clean = hex.replace(/\s+/g, "");

  if (clean.length === 0) return { error: "Hex input is empty." };

  if (!/^[0-9a-fA-F]+$/.test(clean)) {
    return { error: "Invalid hex string — only 0-9 and a-f characters are allowed." };
  }

  if (clean.length % 2 !== 0) {
    return { error: `Odd-length hex string (${clean.length} chars). Hex bytes must come in pairs.` };
  }

  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }

  return { bytes };
}

/**
 * Convenience: parse hex and throw a human-readable string on failure.
 * Useful inside crypto functions that already return error objects.
 */
export function parseHexOrThrow(hex) {
  const result = parseHex(hex);
  if (result.error) throw new Error(result.error);
  return result.bytes;
}
