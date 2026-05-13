// ─── Format Converters ────────────────────────────────────────────────────────

export function hexToAscii(hex) {
  const clean = hex.replace(/\s+/g, "");
  if (!clean.match(/^[0-9a-fA-F]+$/) || clean.length % 2 !== 0)
    return "Invalid hex (odd length or bad chars)";
  return clean.match(/.{2}/g).map(b => String.fromCharCode(parseInt(b, 16))).join("");
}

export function asciiToHex(text) {
  return Array.from(text).map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join(" ");
}

export function hexToDecBytes(hex) {
  const clean = hex.replace(/\s+/g, "");
  if (!clean.match(/^[0-9a-fA-F]+$/) || clean.length % 2 !== 0)
    return "Invalid hex";
  return clean.match(/.{2}/g).map(b => parseInt(b, 16)).join(" ");
}

export function asciiToBinary(text) {
  return Array.from(text).map(c => c.charCodeAt(0).toString(2).padStart(8, "0")).join(" ");
}

export function binaryToAscii(bin) {
  const clean = bin.replace(/\s+/g, "");
  if (!clean.match(/^[01]+$/)) return "Invalid binary (non 0/1 chars)";
  if (clean.length % 8 !== 0) return `Invalid binary (length ${clean.length} is not divisible by 8)`;
  return clean.match(/.{8}/g).map(b => String.fromCharCode(parseInt(b, 2))).join("");
}

export function decBytesToAscii(dec) {
  const nums = dec.trim().split(/[\s,]+/).map(Number);
  if (nums.some(n => isNaN(n) || n < 0 || n > 255)) return "Invalid — values must be 0–255";
  return nums.map(n => String.fromCharCode(n)).join("");
}

export function asciiToDecBytes(text) {
  return Array.from(text).map(c => c.charCodeAt(0)).join(" ");
}

export function urlEncode(text) {
  try { return encodeURIComponent(text); } catch { return "Encoding error"; }
}

export function urlDecode(text) {
  try { return decodeURIComponent(text); } catch { return "Invalid URL encoding"; }
}

export function hexToBase64(hex) {
  try {
    const clean = hex.replace(/\s+/g, "");
    const bytes = clean.match(/.{2}/g).map(b => parseInt(b, 16));
    return btoa(bytes.map(b => String.fromCharCode(b)).join(""));
  } catch { return "Invalid hex"; }
}

export function base64ToHex(b64) {
  try {
    const bin = atob(b64.trim());
    return Array.from(bin).map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join(" ");
  } catch { return "Invalid Base64"; }
}

// ─── Auto-detection ───────────────────────────────────────────────────────────

export function detectFormat(text) {
  const t = text.trim();
  if (!t) return "empty";

  // Binary string
  if (/^[01\s]+$/.test(t) && t.replace(/\s/g, "").length % 8 === 0 && t.replace(/\s/g, "").length > 0)
    return "binary";

  // Pure hex (with or without spaces)
  const hexClean = t.replace(/\s/g, "");
  if (/^[0-9a-fA-F]+$/.test(hexClean) && hexClean.length % 2 === 0 && hexClean.length >= 2)
    return "hex";

  // Decimal bytes (space/comma separated, all 0-255)
  const decParts = t.split(/[\s,]+/);
  if (decParts.length > 1 && decParts.every(p => /^\d+$/.test(p) && Number(p) <= 255))
    return "decimal";

  // URL encoded
  if (/%[0-9a-fA-F]{2}/.test(t)) return "url";

  // Base64-like (check that it decodes cleanly)
  if (/^[A-Za-z0-9+/]+=*$/.test(t) && t.length % 4 === 0 && t.length >= 4) {
    try { atob(t); return "base64"; } catch { /* not base64 */ }
  }

  return "ascii";
}

export const FORMAT_LABELS = {
  ascii:   "ASCII / Text",
  hex:     "Hex",
  binary:  "Binary",
  decimal: "Decimal bytes",
  base64:  "Base64",
  url:     "URL encoded",
  empty:   "Empty",
};

// Convert from any detected format to all other formats
export function convertAll(text) {
  const fmt = detectFormat(text);
  let ascii = "";

  try {
    if (fmt === "ascii")   ascii = text;
    if (fmt === "hex")     ascii = hexToAscii(text);
    if (fmt === "binary")  ascii = binaryToAscii(text);
    if (fmt === "decimal") ascii = decBytesToAscii(text);
    if (fmt === "base64")  ascii = atob(text.trim());
    if (fmt === "url")     ascii = urlDecode(text);
  } catch { ascii = ""; }

  if (!ascii || ascii.startsWith("Invalid")) {
    return { detected: fmt, ascii: "", hex: "", binary: "", decimal: "", base64: "", url: "" };
  }

  return {
    detected: fmt,
    ascii,
    hex:     asciiToHex(ascii),
    binary:  asciiToBinary(ascii),
    decimal: asciiToDecBytes(ascii),
    base64:  btoa(ascii),
    url:     urlEncode(ascii),
  };
}
