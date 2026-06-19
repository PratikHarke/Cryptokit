<div align="center">

# ⬡ CryptoKit

**Privacy-first, browser-based CTF crypto workbench**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-cryptokit--nine.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://cryptokit-nine.vercel.app)
[![Mozilla Observatory](https://img.shields.io/badge/Mozilla%20Observatory-A%2B%20115%2F100-22c55e?style=for-the-badge)](https://observatory.mozilla.org/analyze/cryptokit-nine.vercel.app)
[![CI](https://img.shields.io/github/actions/workflow/status/PratikHarke/Cryptokit/ci.yml?style=for-the-badge&label=578%20Tests)](https://github.com/PratikHarke/Cryptokit/actions)
[![License](https://img.shields.io/github/license/PratikHarke/Cryptokit?style=for-the-badge)](LICENSE)

Decode, crack, and analyze cryptographic payloads **entirely in your browser** — no backend, no analytics, no data leaves your machine.

[**→ Open CryptoKit**](https://cryptokit-nine.vercel.app) · [Report a Bug](https://github.com/PratikHarke/Cryptokit/issues) · [Security Policy](SECURITY.md)

</div>

---

## Why CryptoKit?

Most CTF crypto tools are either online services (your payload hits their server) or heavyweight desktop apps. CryptoKit runs **100% client-side** — paste a hash, ciphertext, or encoded blob and the analysis never leaves your browser tab.

- 🔒 **Zero backend** — all 30+ tools run locally via WebAssembly and Web Crypto
- 🧠 **Smart Solver** — beam-search multi-layer auto-decoder that chains transforms automatically
- 🏁 **CTF-native** — built for competition workflows: writeup generator, challenge mode, flag detection
- ✅ **Mozilla Observatory A+ (115/100)** — hardened CSP, COEP/COOP isolation, strict HSTS

---

## Screenshots

### Smart Solver — auto-detect and decode layered encodings
![Smart Solver](./screenshots/smart-solver.png)

### Manual Pipeline — composable step-by-step transform chains
![Manual Pipeline](./screenshots/manual-pipeline.png)

---

## Tools

### 🧠 Core Workbench

| Tool | What it does |
|---|---|
| **Smart Solver** | Auto-detect + decode in Quick Scan, Deep Scan, or Guided Mode |
| **Manual Pipeline** | Composable transforms with live intermediate output previews |
| **File Analyzer** | Strings, entropy, magic bytes, hex dump on any file |
| **XOR Analyzer** | Encrypt · Single-byte brute force · Repeating-key crack · Crib drag |
| **Hash Analyzer** | Identify · Generate · Verify · Dictionary attack · Argon2 |
| **JWT Inspector** | Decode · Audit claims · `alg:none` attack |
| **CTF Writeup Generator** | Auto-records steps, annotate, export Markdown |
| **Challenge Mode** | 15 built-in CTF puzzles with leaderboard |

### Encoding & Conversion
`Base64` · `Base16/32/58` · `Hex ↔ ASCII` · `Binary` · `Morse Code` · `URL` · `HTML` · `Unicode`

### Classical Ciphers
`Caesar` · `ROT-13` · `Vigenère` · `Atbash` · `Affine` · `Bacon` · `Playfair` · `Rail Fence` · `Columnar` · `Beaufort`

### Cryptanalysis
`Caesar Bruteforce` · `Vigenère Crack (Kasiski + IC)` · `Substitution Solver` · `Frequency Analysis`

### Modern Crypto
`RSA Attacks (Fermat, Wiener, Common Factor, Small Exponent)` · `AES Block Mode Visualizer` · `Number Theory (BigInt)`

### Steganography
`LSB image steganography` — hide and extract data from PNG pixels

### Utilities
`Entropy Visualizer` · `Password Auditor` · `Cipher Wheel` · `Regex Tester`

---

## Smart Solver — How it works

### ⚡ Quick Scan
Single-pass detection over 30+ formats. Returns ranked candidates with confidence scores and human-readable reasoning for every suggestion.

### 🔍 Deep Scan
Beam-search solver that explores multi-layer transform chains:
```
Base64 → XOR → Caesar
Hex → Base64 → URL Decode
ROT13 → Base64 → Gzip
```
Explores hundreds of paths, scores each output for English-likeness and flag patterns, surfaces the most likely solution.

### 🧭 Guided Mode
Step-by-step walkthrough where CryptoKit suggests the next most likely transform at each stage. You confirm or override.

---

## Security

| Property | Status |
|---|---|
| Mozilla Observatory | **A+ · 115/100** |
| Backend / server | **None** |
| Analytics / telemetry | **None** |
| Data transmission | **None** |
| CSP | `wasm-unsafe-eval` only · `frame-ancestors: none` |
| Cross-origin isolation | COEP `require-corp` · COOP `same-origin` |
| HSTS | 2-year preload |
| Runtime deps | 3 packages only (`react`, `react-dom`, `argon2-browser`) |

See [SECURITY.md](SECURITY.md) for the vulnerability disclosure process.

---

## Tech Stack

- **React 18** + **Vite 6**
- **WebAssembly** — Argon2 via `argon2-browser`
- **Vitest** — 578 tests (correctness, adversarial, DoS surface, known crypto vectors)
- **Vercel** — zero-config deploy with hardened security headers

---

## Running Locally

```bash
git clone https://github.com/PratikHarke/Cryptokit.git
cd Cryptokit
npm install
npm run dev       # http://localhost:5173
npm run test:run  # run 578 tests
npm run build     # production build
```

---

## Contributing

Issues and PRs welcome. For security vulnerabilities, see [SECURITY.md](SECURITY.md) — please don't open public issues for security bugs.

---

<div align="center">

Built by [Pratik Harke](https://github.com/PratikHarke) · [LinkedIn](https://www.linkedin.com/in/pratik-harke-b60782293/) · Bug bounty hunter · r4gn4r

</div>
