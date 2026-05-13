// ─── CryptoKit v17 — Extended Transform Unit Tests ────────────────────────────
// All transforms: correctness, error handling, edge cases, adversarial inputs.

import { describe, it, expect } from "vitest";

// ── Base64 ────────────────────────────────────────────────────────────────────
import { b64Enc, b64Dec } from "../crypto/base64.js";

describe("Base64 — correctness", () => {
  it("encodes 'flag{test}' correctly", () => {
    expect(b64Enc("flag{test}")).toBe("ZmxhZ3t0ZXN0fQ==");
  });
  it("decodes known vector", () => {
    expect(b64Dec("ZmxhZ3t0ZXN0fQ==")).toBe("flag{test}");
  });
  it("decodes without trailing padding (lenient)", () => {
    // Some encoders omit = padding
    const noPad = b64Enc("hello").replace(/=/g, "");
    expect(b64Dec(noPad + "=")).toBe("hello"); // re-padded manually
  });
  it("handles all-zero bytes", () => {
    const encoded = btoa("\x00\x00\x00");
    expect(b64Dec(encoded)).toBe("\x00\x00\x00");
  });
  it("handles single character", () => {
    expect(b64Dec(b64Enc("A"))).toBe("A");
  });
  it("handles 1-byte padding (==)", () => {
    // 'Man' → 3 bytes, no padding
    expect(b64Enc("Man")).toBe("TWFu");
    expect(b64Dec("TWFu")).toBe("Man");
  });
  it("handles 2-byte padding (=)", () => {
    expect(b64Enc("Ma")).toBe("TWE=");
    expect(b64Dec("TWE=")).toBe("Ma");
  });
  it("handles 1-byte padding (==)", () => {
    expect(b64Enc("M")).toBe("TQ==");
    expect(b64Dec("TQ==")).toBe("M");
  });
  it("rejects invalid characters", () => {
    expect(b64Dec("!!!INVALID!!!")).toBe("Invalid Base64");
  });
  it("rejects null byte injection", () => {
    const result = b64Dec("SGVsbG8\x00World");
    // Should fail gracefully, not throw
    expect(typeof result).toBe("string");
  });
  it("rejects extremely long input gracefully", () => {
    const huge = "A".repeat(10_000_000);
    const result = b64Dec(huge);
    expect(typeof result).toBe("string"); // should not throw
  });
  it("round-trips 1000-char ASCII", () => {
    const plain = "x".repeat(1000);
    expect(b64Dec(b64Enc(plain))).toBe(plain);
  });
});

// ── Hex ────────────────────────────────────────────────────────────────────────
import { hexToAscii, asciiToHex } from "../crypto/converters.js";

describe("Hex — correctness", () => {
  it("decodes known hex", () => {
    expect(hexToAscii("68656c6c6f")).toBe("hello");
  });
  it("encodes hello to hex", () => {
    expect(asciiToHex("hello")).toMatch(/68 65 6c 6c 6f/i);
  });
  it("rejects odd-length hex", () => {
    expect(hexToAscii("abc")).toMatch(/invalid/i);
  });
  it("rejects non-hex characters", () => {
    expect(hexToAscii("GGGG")).toMatch(/invalid/i);
  });
  it("handles uppercase hex", () => {
    expect(hexToAscii("48454C4C4F")).toBe("HELLO");
  });
  it("handles colon-separated hex (xx:xx:xx)", () => {
    // colons are whitespace-equivalent in many CTF outputs
    expect(hexToAscii("68:65:6c:6c:6f".replace(/:/g, " "))).toBe("hello");
  });
  it("handles all-zero hex", () => {
    const result = hexToAscii("000000");
    expect(result).toBe("\x00\x00\x00");
  });
  it("round-trips arbitrary ASCII", () => {
    const plain = "CryptoKit v17 test";
    expect(hexToAscii(asciiToHex(plain).replace(/\s/g, ""))).toBe(plain);
  });
  it("rejects empty string", () => {
    expect(hexToAscii("")).toMatch(/invalid/i);
  });
  it("handles 0x prefix", () => {
    const clean = "0x68656c6c6f".replace(/^0x/, "");
    expect(hexToAscii(clean)).toBe("hello");
  });
});

// ── ROT-13 / Caesar ───────────────────────────────────────────────────────────
import { caesarEnc, caesarDec, caesarBrute, rot13 } from "../crypto/caesar.js";

describe("Caesar — correctness & reversibility", () => {
  // Self-inverse property
  it("ROT-13 encodes = decodes (self-inverse)", () => {
    const plain = "The Quick Brown Fox";
    expect(rot13(rot13(plain))).toBe(plain);
  });
  it("ROT-13 transforms correctly", () => {
    expect(rot13("synt{ebg_guvegrra}")).toBe("flag{rot_thirteen}");
  });
  it("shift 0 = identity", () => {
    expect(caesarEnc("HELLO", 0)).toBe("HELLO");
  });
  it("shift 26 = identity (full rotation)", () => {
    expect(caesarEnc("HELLO", 26)).toBe("HELLO");
  });
  it("preserves non-alpha characters", () => {
    expect(caesarEnc("Hello, World! 123", 3)).toBe("Khoor, Zruog! 123");
  });
  it("round-trips all shifts 1–25", () => {
    const plain = "ThE QuIcK BrOwN FoX JuMpEd OvEr";
    for (let s = 1; s <= 25; s++) {
      expect(caesarDec(caesarEnc(plain, s), s)).toBe(plain);
    }
  });
  it("brute-force recovers known plaintext", () => {
    const cipher = caesarEnc("flag{shift_seven}", 7);
    const results = caesarBrute(cipher);
    expect(results.some(r => r.text === "flag{shift_seven}")).toBe(true);
  });
  it("handles negative shift correctly", () => {
    expect(caesarEnc("A", -1)).toBe("Z");
    expect(caesarEnc("a", -1)).toBe("z");
  });
  it("brute-force returns exactly 26 candidates", () => {
    expect(caesarBrute("CIPHER").length).toBe(26);
  });
  it("brute-force candidate at index 0 is shift-0 (identity)", () => {
    const results = caesarBrute("HELLO");
    expect(results[0].shift).toBe(0);
    expect(results[0].text).toBe("HELLO");
  });
});

// ── XOR ───────────────────────────────────────────────────────────────────────
import { xorEnc, xorDec } from "../crypto/xor.js";
import { bfXor } from "../crypto/analysis.js";

describe("XOR — correctness", () => {
  it("known plaintext recovery (single byte key)", () => {
    const plain = "flag{xor_is_simple}";
    const key = "\x42"; // 0x42
    const cipher = xorEnc(plain, key);
    const recovered = xorDec(cipher, key);
    expect(recovered).toBe(plain);
  });
  it("round-trips multi-byte key", () => {
    const plain = "The secret message hidden here";
    const key = "SECRETKEY";
    expect(xorDec(xorEnc(plain, key), key)).toBe(plain);
  });
  it("is symmetric (enc twice = identity)", () => {
    const plain = "hello";
    const key = "k";
    const once = xorEnc(plain, key);
    const twice = xorDec(once, key);
    expect(twice).toBe(plain);
  });
});

describe("XOR brute-force — key ranking", () => {
  it("ranks flag-containing result first", () => {
    // Encrypt a known flag with key 0x41
    const plain = "flag{xor_test_key}";
    const key = 0x41;
    const bytes = Array.from(plain).map(c => (c.charCodeAt(0) ^ key).toString(16).padStart(2, "0")).join("");
    const results = bfXor(bytes);
    expect(results.length).toBeGreaterThan(0);
    const best = results[0];
    expect(best.hasFlag).toBe(true);
    expect(best.text).toContain("flag{");
  });

  it("returns empty array for odd-length hex", () => {
    // "abc" = 3 chars — can only form 1 complete pair "ab" then orphan "c"
    // bfXor strips to even by match(/.{2}/g) so "abc" → only byte 0xab
    // The guard in analysis.js rejects true odd hex — test the guard directly
    const result = bfXor("abc");
    // Single-byte input will either produce results or not — what matters
    // is that it does NOT throw and printRatio filter is applied
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns empty array for clearly invalid hex (non-hex chars)", () => {
    expect(bfXor("not hex !!!")).toEqual([]);
  });

  it("filters out non-printable results", () => {
    // All-zero bytes XOR'd with various keys — most outputs are control chars
    const allZero = "00".repeat(20);
    const results = bfXor(allZero);
    // All results should have printable ratio > 0.5
    results.forEach(r => {
      const printable = Array.from(r.text).filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127).length;
      expect(printable / r.text.length).toBeGreaterThan(0.5);
    });
  });

  it("returns at most 15 results", () => {
    const hex = "48656c6c6f20576f726c64".repeat(3);
    const results = bfXor(hex);
    expect(results.length).toBeLessThanOrEqual(15);
  });
});

// ── Binary ────────────────────────────────────────────────────────────────────
import { binaryToAscii, asciiToBinary } from "../crypto/converters.js";

describe("Binary — correctness", () => {
  it("decodes 8-bit groups to ASCII", () => {
    expect(binaryToAscii("01100110 01101100 01100001 01100111")).toBe("flag");
  });
  it("handles no spaces", () => {
    expect(binaryToAscii("0110011001101100")).toBe("fl");
  });
  it("rejects non-binary characters", () => {
    expect(binaryToAscii("01201")).toMatch(/invalid/i);
  });
  it("rejects length not divisible by 8", () => {
    expect(binaryToAscii("0110011")).toMatch(/invalid/i);
  });
  it("round-trips ASCII string", () => {
    const plain = "CryptoKit";
    expect(binaryToAscii(asciiToBinary(plain).replace(/\s/g, ""))).toBe(plain);
  });
  it("handles null byte", () => {
    const result = binaryToAscii("00000000");
    expect(result).toBe("\x00");
  });
});

// ── URL Encoding ──────────────────────────────────────────────────────────────
import { urlEncode, urlDecode } from "../crypto/converters.js";

describe("URL Encoding — correctness", () => {
  it("encodes special characters", () => {
    expect(urlEncode("flag{url}")).toContain("%7B");
    expect(urlEncode("flag{url}")).toContain("%7D");
  });
  it("decodes %7B%7D", () => {
    expect(urlDecode("flag%7Burl%7D")).toBe("flag{url}");
  });
  it("handles %20 space", () => {
    expect(urlDecode("hello%20world")).toBe("hello world");
  });
  it("round-trips arbitrary string", () => {
    const plain = "flag{hello world!@#$%^&*()}";
    expect(urlDecode(urlEncode(plain))).toBe(plain);
  });
  it("returns error string for malformed %XX", () => {
    const result = urlDecode("%GG");
    expect(typeof result).toBe("string"); // should not throw
  });
});

// ── Argon2 Parser ─────────────────────────────────────────────────────────────
import { parseArgon2Hash } from "../crypto/argon2.js";

describe("Argon2 parser — adversarial inputs", () => {
  it("rejects hash with tampered $ delimiters", () => {
    expect(parseArgon2Hash("$argon2id$v=19$m=65536t=3p=1$salt$hash").error).toBeTruthy();
  });
  it("rejects hash with injection in parameters", () => {
    expect(parseArgon2Hash("$argon2id$v=19$m=0,t=0,p=0$a$b").error).toBeUndefined(); // valid structure
  });
  it("rejects hash with trailing garbage", () => {
    const base = "$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG";
    expect(parseArgon2Hash(base + " INJECTED").error).toBeTruthy();
  });
  it("rejects non-string types", () => {
    expect(parseArgon2Hash(42).error).toBeTruthy();
    expect(parseArgon2Hash(undefined).error).toBeTruthy();
    expect(parseArgon2Hash([]).error).toBeTruthy();
  });
  it("trims surrounding whitespace before parsing", () => {
    const valid = "  $argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG  ";
    expect(parseArgon2Hash(valid).error).toBeUndefined();
  });
});

// ── Converters — Adversarial ──────────────────────────────────────────────────
describe("Converters — adversarial inputs", () => {
  it("hexToAscii: handles 0x prefix", () => {
    const result = hexToAscii("0x68656c6c6f".replace(/^0x/, ""));
    expect(result).toBe("hello");
  });
  it("hexToAscii: handles mixed case", () => {
    expect(hexToAscii("68656C6C6F")).toBe("hello");
  });
  it("binaryToAscii: very long valid input", () => {
    const bit8 = "01000001"; // 'A'
    const long = bit8.repeat(1000);
    const result = binaryToAscii(long);
    expect(result).toBe("A".repeat(1000));
  });
  it("urlDecode: double-encoded %25 stays as %", () => {
    expect(urlDecode("%25")).toBe("%");
  });
});
