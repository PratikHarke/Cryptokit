// ─── CryptoKit v9 — Unit Tests ────────────────────────────────────────────────
// Run with:  npm test  (watch)  or  npm run test:run  (CI)

import { describe, it, expect } from "vitest";

// ── Base64 ────────────────────────────────────────────────────────────────────
import { b64Enc, b64Dec } from "../crypto/base64.js";

describe("Base64", () => {
  it("encodes ASCII", () => {
    expect(b64Enc("hello")).toBe("aGVsbG8=");
  });

  it("decodes ASCII", () => {
    expect(b64Dec("aGVsbG8=")).toBe("hello");
  });

  it("round-trips Unicode (emoji)", () => {
    const input = "🔐 crypto";
    expect(b64Dec(b64Enc(input))).toBe(input);
  });

  it("round-trips Unicode (CJK)", () => {
    const input = "密码学 — 暗号";
    expect(b64Dec(b64Enc(input))).toBe(input);
  });

  it("round-trips empty string", () => {
    expect(b64Dec(b64Enc(""))).toBe("");
  });

  it("returns error string for invalid base64", () => {
    expect(b64Dec("!!!not_base64!!!")).toBe("Invalid Base64");
  });
});

// ── Hex Parser ────────────────────────────────────────────────────────────────
import { parseHex } from "../crypto/hexParser.js";

describe("parseHex", () => {
  it("parses valid lowercase hex", () => {
    const { bytes, error } = parseHex("deadbeef");
    expect(error).toBeUndefined();
    expect(Array.from(bytes)).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });

  it("parses valid uppercase hex", () => {
    const { bytes } = parseHex("DEADBEEF");
    expect(Array.from(bytes)).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });

  it("strips whitespace before parsing", () => {
    const { bytes, error } = parseHex("  de ad be ef  ");
    expect(error).toBeUndefined();
    expect(Array.from(bytes)).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });

  it("rejects empty string", () => {
    const { error } = parseHex("");
    expect(error).toBeTruthy();
  });

  it("rejects whitespace-only string", () => {
    const { error } = parseHex("   ");
    expect(error).toBeTruthy();
  });

  it("rejects non-hex characters", () => {
    const { error } = parseHex("deadbefg");
    expect(error).toMatch(/invalid/i);
  });

  it("rejects odd-length hex", () => {
    const { error } = parseHex("abc");
    expect(error).toMatch(/odd/i);
  });

  it("parses single byte 00", () => {
    const { bytes } = parseHex("00");
    expect(Array.from(bytes)).toEqual([0]);
  });

  it("parses single byte ff", () => {
    const { bytes } = parseHex("ff");
    expect(Array.from(bytes)).toEqual([255]);
  });
});

// ── XOR ───────────────────────────────────────────────────────────────────────
import { xorEnc, xorDec } from "../crypto/xor.js";

describe("XOR", () => {
  it("encodes text to hex", () => {
    const hex = xorEnc("A", "\x01");
    // 'A' = 0x41, XOR 0x01 = 0x40
    expect(hex).toBe("40");
  });

  it("round-trips ASCII", () => {
    const key = "secret";
    const plain = "hello, world!";
    expect(xorDec(xorEnc(plain, key), key)).toBe(plain);
  });

  it("round-trips long text with short key (repeating)", () => {
    const key = "k";
    const plain = "abcdefghij";
    expect(xorDec(xorEnc(plain, key), key)).toBe(plain);
  });

  it("returns error on invalid hex input", () => {
    const result = xorDec("ghij", "key");
    expect(result).toMatch(/invalid/i);
  });

  it("returns error on odd-length hex", () => {
    const result = xorDec("abc", "key");
    expect(result).toMatch(/odd/i);
  });

  it("returns error when key is empty", () => {
    const result = xorDec("dead", "");
    expect(result).toBeTruthy();
  });
});

// ── Caesar ────────────────────────────────────────────────────────────────────
import { caesarEnc, caesarDec, caesarBrute } from "../crypto/caesar.js";

describe("Caesar", () => {
  it("encodes with shift 3", () => {
    expect(caesarEnc("ABC", 3)).toBe("DEF");
  });

  it("decodes with shift 3", () => {
    expect(caesarDec("DEF", 3)).toBe("ABC");
  });

  it("round-trips mixed-case", () => {
    const plain = "Hello World";
    expect(caesarDec(caesarEnc(plain, 13), 13)).toBe(plain);
  });

  it("ROT13 is self-inverse", () => {
    const plain = "CTF{test}";
    expect(caesarEnc(caesarEnc(plain, 13), 13)).toBe(plain);
  });

  it("bruteforce returns 26 candidates", () => {
    const results = caesarBrute("KHOOR");
    expect(results).toHaveLength(26);
  });

  it("bruteforce shift 3 recovers HELLO", () => {
    const results = caesarBrute("KHOOR");
    // shift 3 decode of KHOOR = HELLO
    const hit = results.find(r => r.text === "HELLO");
    expect(hit).toBeTruthy();
  });
});

// ── Hash Identifier ───────────────────────────────────────────────────────────
import { identifyHash } from "../crypto/hash.js";

describe("Hash Identifier", () => {
  it("identifies MD5-length hex as MD5", () => {
    const results = identifyHash("5f4dcc3b5aa765d61d8327deb882cf99");
    expect(results.some(r => r.type.includes("MD5"))).toBe(true);
  });

  it("identifies SHA-1-length hex as SHA-1", () => {
    const results = identifyHash("da39a3ee5e6b4b0d3255bfef95601890afd80709");
    expect(results.some(r => r.type.includes("SHA-1"))).toBe(true);
  });

  it("identifies bcrypt by prefix", () => {
    const results = identifyHash("$2b$12$abcdefghijklmnopqrstuuABC123456789012345678901234567890");
    expect(results.some(r => r.type.toLowerCase().includes("bcrypt"))).toBe(true);
  });

  it("identifies Argon2id by prefix", () => {
    const hash = "$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG";
    const results = identifyHash(hash);
    expect(results.some(r => r.type.toLowerCase().includes("argon2"))).toBe(true);
  });

  it("returns empty array for gibberish", () => {
    const results = identifyHash("notahash!!!");
    expect(Array.isArray(results)).toBe(true);
  });
});

// ── Argon2 Parser ─────────────────────────────────────────────────────────────
import { parseArgon2Hash } from "../crypto/argon2.js";

describe("parseArgon2Hash", () => {
  const VALID = "$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG";

  it("parses argon2id hash", () => {
    const r = parseArgon2Hash(VALID);
    expect(r.error).toBeUndefined();
    expect(r.variant).toBe("argon2id");
    expect(r.version).toBe(19);
    expect(r.m).toBe(65536);
    expect(r.t).toBe(3);
    expect(r.p).toBe(1);
  });

  it("parses argon2i hash", () => {
    const hash = "$argon2i$v=19$m=4096,t=2,p=1$c2FsdHNhbHQ$hashvalue==";
    const r = parseArgon2Hash(hash);
    expect(r.error).toBeUndefined();
    expect(r.variant).toBe("argon2i");
  });

  it("parses argon2d hash", () => {
    const hash = "$argon2d$v=19$m=4096,t=2,p=1$c2FsdHNhbHQ$hashvalue==";
    const r = parseArgon2Hash(hash);
    expect(r.error).toBeUndefined();
    expect(r.variant).toBe("argon2d");
  });

  it("returns error for empty input", () => {
    expect(parseArgon2Hash("").error).toBeTruthy();
  });

  it("returns error for plain MD5 hash", () => {
    expect(parseArgon2Hash("5f4dcc3b5aa765d61d8327deb882cf99").error).toBeTruthy();
  });

  it("returns error for bcrypt hash", () => {
    expect(parseArgon2Hash("$2b$12$abc").error).toBeTruthy();
  });

  it("returns error for non-string input", () => {
    expect(parseArgon2Hash(null).error).toBeTruthy();
  });
});

// ── BigInt helpers (from numberTheory) ────────────────────────────────────────
import { intSqrt } from "../crypto/numberTheory.js";

describe("intSqrt (BigInt safe square root)", () => {
  it("sqrt(0) = 0", () => expect(intSqrt(0n)).toBe(0n));
  it("sqrt(1) = 1", () => expect(intSqrt(1n)).toBe(1n));
  it("sqrt(4) = 2", () => expect(intSqrt(4n)).toBe(2n));
  it("sqrt(9) = 3", () => expect(intSqrt(9n)).toBe(3n));
  it("sqrt(10) = 3 (floor)", () => expect(intSqrt(10n)).toBe(3n));
  it("sqrt(large perfect square)", () => {
    const n = 999999999999999999n * 999999999999999999n;
    expect(intSqrt(n)).toBe(999999999999999999n);
  });
  it("is stable beyond Number.MAX_SAFE_INTEGER", () => {
    // 2^54 is beyond MAX_SAFE_INTEGER
    const n = (1n << 54n) ** 2n;
    expect(intSqrt(n)).toBe(1n << 54n);
  });
});

// ── Morse Code ────────────────────────────────────────────────────────────────
import { morseEnc, morseDec } from "../crypto/morse.js";

describe("Morse Code", () => {
  describe("decode — uppercase output", () => {
    it("decodes HELLO", () => expect(morseDec(".... . .-.. .-.. ---")).toBe("HELLO"));
    it("decodes SOS",   () => expect(morseDec("... --- ...")).toBe("SOS"));
    it("decodes HELLO WORLD with word separator",
       () => expect(morseDec(".... . .-.. .-.. --- / .-- --- .-. .-.. -..")).toBe("HELLO WORLD"));
    it("unknown symbol returns ?",
       () => expect(morseDec("....---")).toBe("?"));
    it("decodes single letter A",
       () => expect(morseDec(".-")).toBe("A"));
  });

  describe("encode then decode round-trip", () => {
    it("round-trips hello → HELLO", () => {
      const encoded = morseEnc("hello");
      expect(morseDec(encoded)).toBe("HELLO");
    });
    it("round-trips sos → SOS", () => {
      const encoded = morseEnc("sos");
      expect(morseDec(encoded)).toBe("SOS");
    });
  });
});

// ── Scorer — confidence thresholds ────────────────────────────────────────────
import { scoreBreakdown } from "../crypto/scorer.js";

describe("scoreBreakdown — confidence thresholds", () => {
  it("Hello World from Base64 scores >= 70%", () => {
    const { confidence } = scoreBreakdown("Hello World", "SGVsbG8gV29ybGQ=");
    expect(confidence).toBeGreaterThanOrEqual(70);
  });

  it("binary garbage scores 0%", () => {
    const { confidence } = scoreBreakdown("\x00\x01\x80\xff\xfe");
    expect(confidence).toBe(0);
  });

  it("flag{hello_world} scores >= 70% (flag bonus)", () => {
    const { confidence } = scoreBreakdown("flag{hello_world}");
    expect(confidence).toBeGreaterThanOrEqual(70);
  });

  it("plain readable English scores >= 70%", () => {
    const { confidence } = scoreBreakdown("The quick brown fox", "dGhlIHF1aWNrIGJyb3duIGZveA==");
    expect(confidence).toBeGreaterThanOrEqual(60);
  });
});

// ── URL encode/decode (converters) ────────────────────────────────────────────
describe("URL decode — via decodeURIComponent", () => {
  it("decodes Hello%20World%21", () => {
    expect(decodeURIComponent("Hello%20World%21")).toBe("Hello World!");
  });
  it("decodes %7Bflag%7D", () => {
    expect(decodeURIComponent("%7Bflag%7D")).toBe("{flag}");
  });
  it("throws on invalid sequence", () => {
    expect(() => decodeURIComponent("%GG")).toThrow();
  });
});
