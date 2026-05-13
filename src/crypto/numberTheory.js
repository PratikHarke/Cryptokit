// All arithmetic uses BigInt for arbitrary precision

// ─── GCD & Extended Euclidean ─────────────────────────────────────────────────

export function gcd(a, b) {
  a = BigInt(a); b = BigInt(b);
  while (b) { [a, b] = [b, a % b]; }
  return a < 0n ? -a : a;
}

export function extendedGCD(a, b) {
  // Returns { gcd, x, y } such that a*x + b*y = gcd
  a = BigInt(a); b = BigInt(b);
  if (b === 0n) return { gcd: a, x: 1n, y: 0n };
  const { gcd: g, x: x1, y: y1 } = extendedGCD(b, a % b);
  return { gcd: g, x: y1, y: x1 - (a / b) * y1 };
}

export function extendedGCDSteps(a, b) {
  // Returns steps for display
  a = BigInt(a); b = BigInt(b);
  const steps = [];
  let [old_r, r] = [a, b];
  let [old_s, s] = [1n, 0n];
  let [old_t, t] = [0n, 1n];
  while (r !== 0n) {
    const q = old_r / r;
    steps.push({ q, r: old_r, divisor: r, remainder: old_r - q * r });
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
    [old_t, t] = [t, old_t - q * t];
  }
  return { gcd: old_r, x: old_s, y: old_t, steps };
}

// ─── Modular Inverse ──────────────────────────────────────────────────────────

export function modInverse(a, m) {
  a = BigInt(a); m = BigInt(m);
  const { gcd: g, x } = extendedGCD(a, m);
  if (g !== 1n) return null; // no inverse exists
  return ((x % m) + m) % m;
}

// ─── Modular Exponentiation ───────────────────────────────────────────────────

export function modPow(base, exp, mod) {
  base = BigInt(base); exp = BigInt(exp); mod = BigInt(mod);
  if (mod === 1n) return 0n;
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = result * base % mod;
    exp = exp / 2n;
    base = base * base % mod;
  }
  return result;
}

// ─── Chinese Remainder Theorem ────────────────────────────────────────────────

export function crt(remainders, moduli) {
  // Solve x ≡ r_i (mod m_i) for all i
  // Returns { x, N } where N = product of all moduli
  const rems = remainders.map(BigInt);
  const mods = moduli.map(BigInt);
  const N = mods.reduce((a, b) => a * b, 1n);
  let x = 0n;
  for (let i = 0; i < rems.length; i++) {
    const Ni = N / mods[i];
    const inv = modInverse(Ni, mods[i]);
    if (inv === null) return { error: `Moduli ${mods[i]} and ${Ni} are not coprime` };
    x += rems[i] * Ni * inv;
  }
  return { x: ((x % N) + N) % N, N };
}

// ─── Miller-Rabin Primality Test ──────────────────────────────────────────────

export function millerRabin(n, witnesses = null) {
  n = BigInt(n);
  if (n < 2n) return { isPrime: false, witnesses: [] };
  if (n === 2n || n === 3n) return { isPrime: true, witnesses: [] };
  if (n % 2n === 0n) return { isPrime: false, witnesses: ["2 (even)"] };

  // Write n-1 as 2^r * d
  let r = 0n, d = n - 1n;
  while (d % 2n === 0n) { d /= 2n; r++; }

  const defaultWitnesses = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  const ws = (witnesses || defaultWitnesses).map(BigInt).filter(w => w < n);

  const failedWitnesses = [];
  for (const a of ws) {
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let composite = true;
    for (let i = 0n; i < r - 1n; i++) {
      x = x * x % n;
      if (x === n - 1n) { composite = false; break; }
    }
    if (composite) failedWitnesses.push(a.toString());
  }

  return {
    isPrime: failedWitnesses.length === 0,
    witnesses: ws.map(w => w.toString()),
    failedWitnesses,
    r: r.toString(),
    d: d.toString(),
  };
}

// ─── Trial Division Factorization ────────────────────────────────────────────

export function factorize(n) {
  n = BigInt(n);
  if (n < 2n) return { factors: [], error: "n must be ≥ 2" };
  if (n > 10n ** 15n) return { factors: [], error: "n too large for trial division (max 10^15)" };

  const factors = [];
  let remaining = n;

  for (let p = 2n; p * p <= remaining; p++) {
    while (remaining % p === 0n) {
      factors.push(p.toString());
      remaining /= p;
    }
  }
  if (remaining > 1n) factors.push(remaining.toString());

  const unique = [...new Set(factors)];
  const factorMap = unique.map(f => ({ prime: f, exp: factors.filter(x => x === f).length }));
  return { factors: factorMap, all: factors, isPrime: factors.length === 1 };
}

// ─── BigInt Square Root (pure BigInt Newton's method) ────────────────────────

export function bigIntSqrt(n) {
  n = BigInt(n);
  if (n < 0n) throw new Error("Negative sqrt");
  if (n < 2n) return n;
  let x0 = n;
  let x1 = (n >> 1n) + 1n;
  while (x1 < x0) {
    x0 = x1;
    x1 = (x1 + n / x1) >> 1n;
  }
  return x0;
}

// ─── Fermat Factorization ────────────────────────────────────────────────────

export function fermatFactor(n) {
  n = BigInt(n);
  if (n % 2n === 0n) return { p: 2n, q: n / 2n };
  let a = bigIntSqrt(n);
  if (a * a < n) a++;
  const MAX_ITER = 100000n;
  for (let i = 0n; i < MAX_ITER; i++) {
    const b2 = a * a - n;
    const b = bigIntSqrt(b2);
    if (b * b === b2) return { p: a - b, q: a + b, iterations: (i + 1n).toString() };
    a++;
  }
  return { error: "Failed to factor within iteration limit — p and q likely far apart" };
}

// ─── Integer Square Root ──────────────────────────────────────────────────────

/** Returns the integer (floor) square root as a BigInt */
export function intSqrt(n) {
  return bigIntSqrt(n);
}

/** Returns { root, isPerfect } — use this where the perfect-square check is needed */
export function intSqrtInfo(n) {
  const root = bigIntSqrt(BigInt(n));
  return { root, isPerfect: root * root === BigInt(n) };
}

// ─── Euler's Totient ─────────────────────────────────────────────────────────

export function eulerTotient(n) {
  // For n = p*q (RSA): φ(n) = (p-1)(q-1)
  const { factors } = factorize(n);
  if (factors.error) return null;
  let result = BigInt(n);
  const seen = new Set();
  for (const { prime } of factors) {
    if (!seen.has(prime)) {
      seen.add(prime);
      const p = BigInt(prime);
      result = result / p * (p - 1n);
    }
  }
  return result;
}
