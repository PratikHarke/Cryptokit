import { MORSE_MAP, MORSE_REV } from "../constants.js";

// ─── Morse Code ───────────────────────────────────────────────────────────────

export function morseEnc(text) {
  return text.toLowerCase().split("").map(c =>
    c === " " ? "/" : (MORSE_MAP[c] || "?")
  ).join(" ");
}

export function morseDec(text) {
  return text.split(" / ")
    .map(w => w.split(" ").filter(t => t.length > 0).map(t => MORSE_REV[t] || "?").join(""))
    .join(" ")
    .toUpperCase();
}
