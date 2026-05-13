// ── Crypto reference data ─────────────────────────────────────────────────────
// Navigation config and tool registry have moved to src/lib/registry.js

export const EN_FREQ = {
  a:8.2,  b:1.5,  c:2.8,  d:4.3,  e:12.7, f:2.2,  g:2.0,  h:6.1,
  i:7.0,  j:0.2,  k:0.8,  l:4.0,  m:2.4,  n:6.7,  o:7.5,  p:1.9,
  q:0.1,  r:6.0,  s:6.3,  t:9.1,  u:2.8,  v:1.0,  w:2.4,  x:0.2,
  y:2.0,  z:0.1,
};

export const MORSE_MAP = {
  a:".-",   b:"-...", c:"-.-.", d:"-..",  e:".",    f:"..-.", g:"--.",  h:"....",
  i:"..",   j:".---", k:"-.-",  l:".-..", m:"--",   n:"-.",   o:"---",  p:".--.",
  q:"--.-", r:".-.",  s:"...",  t:"-",    u:"..-",  v:"...-", w:".--",  x:"-..-",
  y:"-.--", z:"--..",
  0:"-----",1:".----",2:"..---",3:"...--",4:"....-",
  5:".....",6:"-....",7:"--...",8:"---..",9:"----.",
};

export const MORSE_REV = Object.fromEntries(
  Object.entries(MORSE_MAP).map(([k, v]) => [v, k])
);
