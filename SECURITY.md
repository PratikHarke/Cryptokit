# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 9.x     | ✅ Yes    |
| < 9.0   | ❌ No     |

## Security Design

CryptoKit is designed privacy-first and runs **entirely client-side**:

- **No backend** — all cryptographic operations execute in your browser
- **No analytics or telemetry** — zero tracking SDKs in the codebase
- **No data transmission** — inputs never leave your machine
- **Mozilla Observatory: A+ (115/100)** — verified June 2026
- **CSP hardened** — `unsafe-eval` removed, strict `frame-ancestors: none`
- **COEP + COOP** — cross-origin isolation enabled for WASM security

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not open a public GitHub issue**.

**Contact:** [insanepratik09@gmail.com](mailto:insanepratik09@gmail.com)  
**Subject line:** `[CryptoKit Security] <brief description>`

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

I aim to respond within **72 hours** and will credit researchers in the changelog unless anonymity is requested.

## Scope

Since CryptoKit has no backend, the relevant attack surface is:

| In Scope | Out of Scope |
|----------|--------------|
| XSS via crafted input in any tool | Rate limiting (no backend) |
| CSP bypass | SSRF (no outbound requests) |
| WASM sandbox escape | Social engineering |
| Supply chain (dependency hijack) | Physical attacks |
| Crypto correctness bugs (wrong output) | |

## Bug Bounty

This is an open-source personal project — no formal bounty program exists. Credible reports will receive public acknowledgment and a shoutout on LinkedIn.
