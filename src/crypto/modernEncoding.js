// ─── HTML Entity Encode/Decode ────────────────────────────────────────────────

export function htmlEncode(text) {
  return text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#x27;");
}

export function htmlDecode(text) {
  // Safe: DOMParser creates an inert document — scripts are never executed.
  try {
    const doc = new DOMParser().parseFromString(
      `<!DOCTYPE html><body>${text}</body>`,
      "text/html"
    );
    return doc.body.textContent ?? text;
  } catch {
    return text
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
  }
}

// ─── Unicode Escape Encode/Decode ─────────────────────────────────────────────

export function unicodeEscape(text) {
  return Array.from(text).map(c => {
    const code = c.codePointAt(0);
    if (code > 0xFFFF) return `\\U${code.toString(16).toUpperCase().padStart(8,"0")}`;
    if (code > 127 || code < 32) return `\\u${code.toString(16).padStart(4,"0")}`;
    return c;
  }).join("");
}

export function unicodeDecode(text) {
  return text
    .replace(/\\U([0-9a-fA-F]{8})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\r/g, "\r");
}

// ─── Punycode encode/decode (basic) ──────────────────────────────────────────

export function punycodeToUnicode(domain) {
  try {
    // Use URL API — works in browsers
    const url = new URL("https://" + domain);
    return url.hostname;
  } catch {
    return "Invalid domain";
  }
}

export function unicodeToPunycode(domain) {
  try {
    const url = new URL("https://" + domain);
    return url.hostname; // browser normalizes to punycode
  } catch {
    return "Invalid domain";
  }
}

// ─── Zero-Width Character Steganography ──────────────────────────────────────

export const ZW_CHARS = {
  "\u200B": "ZWSP (Zero Width Space)",
  "\u200C": "ZWNJ (Zero Width Non-Joiner)",
  "\u200D": "ZWJ (Zero Width Joiner)",
  "\uFEFF": "BOM/ZWNBSP",
  "\u00AD": "Soft Hyphen",
  "\u2060": "Word Joiner",
  "\u2062": "Invisible Times",
  "\u2063": "Invisible Separator",
};

export function detectZeroWidth(text) {
  const found = [];
  const positions = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ZW_CHARS[ch]) {
      found.push({ char: ch, name: ZW_CHARS[ch], position: i, hex: ch.charCodeAt(0).toString(16).padStart(4,"0") });
      positions.push(i);
    }
  }
  // Try to decode as binary (ZWSP=0, ZWJ=1)
  let binary = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\u200B") binary += "0";
    else if (text[i] === "\u200D") binary += "1";
  }
  let decoded = "";
  if (binary.length >= 8) {
    try {
      decoded = binary.match(/.{8}/g)?.map(b => String.fromCharCode(parseInt(b,2))).join("") || "";
    } catch {}
  }
  return { found, count: found.length, binary, decoded, positions };
}

export function stripZeroWidth(text) {
  return text.replace(/[\u200B-\u200D\uFEFF\u00AD\u2060\u2062\u2063]/g, "");
}

// ─── Whitespace Steganography ─────────────────────────────────────────────────

export function detectWhitespace(text) {
  const lines = text.split("\n");
  const results = [];
  let binary = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trailing = line.length - line.trimEnd().length;
    const tabs = (line.match(/\t/g) || []).length;
    results.push({ line: i + 1, trailingSpaces: trailing, tabs, suspicious: trailing > 0 || tabs > 0 });
    if (trailing > 0) binary += "1";
    else binary += "0";
  }
  let decoded = "";
  if (binary.length >= 8) {
    try {
      decoded = binary.match(/.{8}/g)?.map(b => String.fromCharCode(parseInt(b,2))).join("") || "";
    } catch {}
  }
  return { lines: results, binary, decoded, suspicious: results.filter(r => r.suspicious).length };
}

// ─── JWT Secret Bruteforce ────────────────────────────────────────────────────
// Client-side HMAC-SHA256 using SubtleCrypto

export async function bruteforceJWTSecret(token, wordlist) {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return { error: "Invalid JWT format." };

  const [header, payload, signature] = parts;
  const signingInput = `${header}.${payload}`;
  const enc = new TextEncoder();

  // Decode expected signature
  const expectedSigBase64 = signature.replace(/-/g, "+").replace(/_/g, "/");
  const expectedSig = Uint8Array.from(atob(expectedSigBase64.padEnd(expectedSigBase64.length + (4 - expectedSigBase64.length % 4) % 4, "=")), c => c.charCodeAt(0));

  const results = [];
  for (const secret of wordlist) {
    try {
      const key = await crypto.subtle.importKey(
        "raw", enc.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false, ["sign"]
      );
      const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(signingInput)));
      const match = sig.length === expectedSig.length && sig.every((b, i) => b === expectedSig[i]);
      if (match) results.push({ secret, match: true });
    } catch {}
  }
  return { results, tested: wordlist.length };
}

// ─── Common JWT secrets wordlist ──────────────────────────────────────────────

export const JWT_WORDLIST = [
  "secret","password","123456","qwerty","admin","letmein","changeme",
  "welcome","test","development","production","staging","api","key",
  "jwt","token","auth","authorization","bearer","access","refresh",
  "supersecret","topsecret","mysecret","yoursecret","oursecret",
  "secret123","password123","admin123","test123","hello","world",
  "stackoverflow","github","security","crypto","node","express",
  "flask","django","rails","laravel","spring","secure","insecure",
  "notasecret","pleasechange","changethis","defaultsecret","example",
  "shhhhh","keyboard cat","your-256-bit-secret","your-secret","abcdef",
  "SUPER_SECRET_KEY","JWT_SECRET","APP_SECRET","SESSION_SECRET",
];
