// ─── RC4 Stream Cipher ────────────────────────────────────────────────────────

function rc4KSA(key) {
  const S = Array.from({ length: 256 }, (_, i) => i);
  const k = [...key].map(c => c.charCodeAt(0));
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + k[i % k.length]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
  }
  return S;
}

function rc4PRGA(S, length) {
  const out = [];
  let i = 0, j = 0;
  const state = [...S];
  for (let n = 0; n < length; n++) {
    i = (i + 1) % 256;
    j = (j + state[i]) % 256;
    [state[i], state[j]] = [state[j], state[i]];
    out.push(state[(state[i] + state[j]) % 256]);
  }
  return out;
}

export function rc4Encrypt(plaintext, key) {
  if (!key) return { error: "Key required" };
  const S = rc4KSA(key);
  const keystream = rc4PRGA(S, plaintext.length);
  const cipher = [...plaintext].map((c, i) => c.charCodeAt(0) ^ keystream[i]);
  return {
    hex: cipher.map(b => b.toString(16).padStart(2, "0")).join(""),
    bytes: cipher,
    keystream: keystream.slice(0, plaintext.length),
  };
}

export function rc4Decrypt(hexOrBytes, key) {
  if (!key) return { error: "Key required" };
  let bytes;
  if (typeof hexOrBytes === "string") {
    const clean = hexOrBytes.replace(/\s/g, "");
    if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0)
      return { error: "Invalid hex input" };
    bytes = clean.match(/.{2}/g).map(h => parseInt(h, 16));
  } else {
    bytes = hexOrBytes;
  }
  const S = rc4KSA(key);
  const keystream = rc4PRGA(S, bytes.length);
  const plain = bytes.map((b, i) => b ^ keystream[i]);
  return {
    text: plain.map(b => String.fromCharCode(b)).join(""),
    bytes: plain,
    keystream: keystream,
  };
}

export function rc4KeystreamBytes(key, length) {
  const S = rc4KSA(key);
  return rc4PRGA(S, length);
}
