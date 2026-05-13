import { modPow, modInverse, gcd, fermatFactor, factorize, intSqrtInfo, extendedGCD } from "./numberTheory.js";

// ─── Parse big integer from string ───────────────────────────────────────────

function parseBig(s) {
  s = (s || "").trim().replace(/\s/g, "");
  if (!s) return null;
  try { return BigInt(s); } catch { return null; }
}

// ─── Small Exponent Attack (e=3) ──────────────────────────────────────────────
// If c = m^e mod n and m^e < n, then m = cube_root(c)

// Safe BigInt cube root using Newton's method with a BigInt seed.
// Avoids Number(n) which loses precision for n > 2^53.
function bigCbrt(n) {
  if (n === 0n) return 0n;
  if (n < 0n) return -bigCbrt(-n);
  // Seed: use bit-length to get a rough power-of-two starting estimate
  const bits = n.toString(2).length;
  let x = 1n << BigInt(Math.ceil(bits / 3));
  for (let i = 0; i < 200; i++) {
    const x1 = (2n * x + n / (x * x)) / 3n;
    if (x1 >= x) return x;
    x = x1;
  }
  return x;
}

// Safe general BigInt nth-root using Newton's method with a BigInt seed.
function bigNthRoot(n, e) {
  if (e === 3n) return bigCbrt(n);
  if (n === 0n) return 0n;
  const bits = n.toString(2).length;
  let x = 1n << BigInt(Math.ceil(bits / Number(e)));
  if (x === 0n) x = 1n;
  for (let i = 0; i < 300; i++) {
    // x1 = ((e-1)*x + n / x^(e-1)) / e
    const xpe = x ** (e - 1n);
    if (xpe === 0n) break;
    const x1 = ((e - 1n) * x + n / xpe) / e;
    if (x1 >= x) return x;
    x = x1;
  }
  return x;
}

export function smallExponentAttack(n_str, e_str, c_str) {
  const n = parseBig(n_str), e = parseBig(e_str), c = parseBig(c_str);
  if (!n || !e || !c) return { error: "Invalid input — provide n, e, c as integers." };
  if (e > 100n) return { error: "e is large — small exponent attack only applies for small e (typically 3)." };

  // Check if c < n^e (meaning m^e < n, so no modular reduction occurred)
  // Try direct e-th root
  const root = bigCbrt(c); // works best for e=3
  if (root ** e === c) {
    const m = root;
    let mStr = m.toString();
    // Try to decode as ASCII
    let ascii = "";
    let hex = mStr; // it's already decimal
    try {
      let hexM = m.toString(16);
      if (hexM.length % 2 !== 0) hexM = "0" + hexM;
      ascii = hexM.match(/.{2}/g).map(h => {
        const code = parseInt(h, 16);
        return code >= 32 && code < 127 ? String.fromCharCode(code) : ".";
      }).join("");
    } catch {}
    return {
      success: true,
      attack: "Small exponent (direct root)",
      m: mStr,
      ascii,
      note: `c^(1/${e}) = ${mStr}`,
    };
  }
  return {
    success: false,
    attack: "Small exponent",
    note: `Direct root failed — modular reduction likely occurred. Use Håstad's broadcast if you have ${e} ciphertexts from different keys.`,
  };
}

// ─── Common Factor Attack ─────────────────────────────────────────────────────
// If two RSA moduli share a prime factor, GCD reveals it

export function commonFactorAttack(n1_str, n2_str) {
  const n1 = parseBig(n1_str), n2 = parseBig(n2_str);
  if (!n1 || !n2) return { error: "Provide both moduli n1 and n2." };
  if (n1 === n2) return { error: "n1 and n2 are identical." };

  const g = gcd(n1, n2);
  if (g === 1n) {
    return { success: false, note: "GCD = 1 — no common factor found. Keys appear independent." };
  }
  const p = g;
  const q1 = n1 / p;
  const q2 = n2 / p;
  return {
    success: true,
    attack: "Common factor (GCD)",
    sharedFactor: p.toString(),
    q1: q1.toString(),
    q2: q2.toString(),
    note: `Shared prime p = ${p.toString().slice(0, 40)}… found via GCD(n1, n2)`,
  };
}

// ─── Fermat Factoring Attack ──────────────────────────────────────────────────
// Works when p and q are close (|p - q| is small)

export function fermatAttack(n_str, e_str, c_str) {
  const n = parseBig(n_str), e = parseBig(e_str), c = parseBig(c_str);
  if (!n || !e) return { error: "Provide at least n and e." };
  if (n % 2n === 0n) return { error: "n is even — not a valid RSA modulus." };

  const result = fermatFactor(n);
  if (result.error) return { success: false, attack: "Fermat", note: result.error };

  const p = result.p, q = result.q;
  const phi = (p - 1n) * (q - 1n);
  const d = modInverse(e, phi);
  if (!d) return { success: false, attack: "Fermat", p: p.toString(), q: q.toString(), note: "Factored but could not compute d — check e." };

  let m = null, ascii = "";
  if (c) {
    m = modPow(c, d, n);
    try {
      let hexM = m.toString(16);
      if (hexM.length % 2) hexM = "0" + hexM;
      ascii = hexM.match(/.{2}/g).map(h => {
        const code = parseInt(h, 16);
        return code >= 32 && code < 127 ? String.fromCharCode(code) : ".";
      }).join("");
    } catch {}
  }

  return {
    success: true,
    attack: "Fermat factorization",
    p: p.toString(),
    q: q.toString(),
    phi: phi.toString(),
    d: d.toString(),
    m: m ? m.toString() : null,
    ascii,
    iterations: result.iterations,
    note: `p and q were close — Fermat succeeded in ${result.iterations} iterations`,
  };
}

// ─── Wiener's Attack ──────────────────────────────────────────────────────────
// Recovers d when d < n^0.25 using continued fractions of e/n

function continuedFraction(num, den) {
  // Returns the convergents of num/den
  const convergents = [];
  let [a, b] = [BigInt(num), BigInt(den)];
  while (b) {
    const q = a / b;
    convergents.push(q);
    [a, b] = [b, a % b];
  }
  return convergents;
}

function getConvergents(cfTerms) {
  const convs = [];
  let h0 = 1n, h1 = cfTerms[0];
  let k0 = 0n, k1 = 1n;
  convs.push({ h: h1, k: k1 });
  for (let i = 1; i < cfTerms.length; i++) {
    const a = cfTerms[i];
    const h2 = a * h1 + h0;
    const k2 = a * k1 + k0;
    convs.push({ h: h2, k: k2 });
    [h0, h1] = [h1, h2];
    [k0, k1] = [k1, k2];
  }
  return convs;
}

export function wienerAttack(n_str, e_str, c_str) {
  const n = parseBig(n_str), e = parseBig(e_str), c = parseBig(c_str);
  if (!n || !e) return { error: "Provide at least n and e." };

  const cfTerms = continuedFraction(e, n);
  const convergents = getConvergents(cfTerms);

  for (const { h: k, k: d } of convergents) {
    if (k === 0n || d === 0n) continue;
    if ((e * d - 1n) % k !== 0n) continue;
    const phi = (e * d - 1n) / k;
    // Check if phi gives integer p, q via quadratic formula
    // n = p*q, phi = (p-1)(q-1) = n - p - q + 1 → p+q = n - phi + 1
    const sum = n - phi + 1n;
    const discriminant = sum * sum - 4n * n;
    if (discriminant < 0n) continue;
    const sqrtDisc = intSqrtInfo(discriminant);
    if (!sqrtDisc.isPerfect) continue;
    const p = (sum + sqrtDisc.root) / 2n;
    const q = (sum - sqrtDisc.root) / 2n;
    if (p * q !== n) continue;

    let m = null, ascii = "";
    if (c) {
      m = modPow(c, d, n);
      try {
        let hexM = m.toString(16);
        if (hexM.length % 2) hexM = "0" + hexM;
        ascii = hexM.match(/.{2}/g).map(h => {
          const code = parseInt(h, 16);
          return code >= 32 && code < 127 ? String.fromCharCode(code) : ".";
        }).join("");
      } catch {}
    }

    return {
      success: true,
      attack: "Wiener's attack",
      d: d.toString(),
      k: k.toString(),
      p: p.toString(),
      q: q.toString(),
      phi: phi.toString(),
      m: m ? m.toString() : null,
      ascii,
      note: `Private key d recovered via continued fraction convergents of e/n`,
    };
  }

  return {
    success: false,
    attack: "Wiener's attack",
    note: "No convergent produced valid factorization — d is likely large (> n^0.25). Key is not vulnerable to Wiener.",
  };
}

// ─── Decrypt with known p, q ──────────────────────────────────────────────────

export function rsaDecrypt(n_str, e_str, p_str, q_str, c_str) {
  const n = parseBig(n_str), e = parseBig(e_str);
  const p = parseBig(p_str), q = parseBig(q_str), c = parseBig(c_str);
  if (!n || !e || !p || !q || !c) return { error: "All fields required." };
  if (p * q !== n) return { error: "p × q ≠ n — check your values." };

  const phi = (p - 1n) * (q - 1n);
  const d = modInverse(e, phi);
  if (!d) return { error: "gcd(e, φ(n)) ≠ 1 — e and φ(n) are not coprime." };
  const m = modPow(c, d, n);

  let hexM = m.toString(16);
  if (hexM.length % 2) hexM = "0" + hexM;
  const ascii = hexM.match(/.{2}/g)?.map(h => {
    const code = parseInt(h, 16);
    return code >= 32 && code < 127 ? String.fromCharCode(code) : ".";
  }).join("") ?? "";

  return { d: d.toString(), phi: phi.toString(), m: m.toString(), ascii };
}

// ─── Run all applicable attacks ───────────────────────────────────────────────

export function analyzeRSA(n_str, e_str, c_str, n2_str) {
  const n = parseBig(n_str), e = parseBig(e_str);
  if (!n || !e) return { error: "n and e are required." };

  const results = [];

  // Small e
  if (e <= 17n && c_str) {
    results.push({ name: "Small Exponent", ...smallExponentAttack(n_str, e_str, c_str) });
  }

  // Fermat (fast, always try)
  results.push({ name: "Fermat Factoring", ...fermatAttack(n_str, e_str, c_str) });

  // Wiener
  results.push({ name: "Wiener's Attack", ...wienerAttack(n_str, e_str, c_str) });

  // Common factor
  if (n2_str && parseBig(n2_str)) {
    results.push({ name: "Common Factor (GCD)", ...commonFactorAttack(n_str, n2_str) });
  }

  // Factor small n
  const nVal = parseBig(n_str);
  if (nVal && nVal < 10n ** 15n) {
    const fResult = factorize(n_str);
    if (!fResult.error && fResult.factors.length >= 2) {
      const p = BigInt(fResult.factors[0].prime);
      const q = BigInt(fResult.factors[1].prime);
      results.push({ name: "Direct Factorization", success: true, attack: "Trial division", p: p.toString(), q: q.toString() });
    }
  }

  return { results, n, e };
}
