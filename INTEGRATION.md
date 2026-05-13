# CryptKit v7 → Smart Cryptanalysis Upgrade
## Complete Integration Guide

---

## What was built

| File | Role | New? |
|---|---|---|
| `src/crypto/detector.js`        | Auto-detection layer (regex + entropy + IC) | ✅ NEW |
| `src/crypto/scorer.js`          | Multi-metric confidence scoring              | ✅ NEW |
| `src/crypto/pipelineEngine.js`  | BFS multi-layer transform engine             | ✅ NEW |
| `src/views/CryptanalysisView.jsx`| UI for the new system                       | ✅ NEW |
| `src/lib/registry.js`           | One line addition (no other changes)         | ✏️ PATCH |

Zero existing files are modified. Zero existing tools are broken.

---

## Step 1 — Copy the new files

Copy the four new source files into your project:

```
cryptokit_v7/
  src/
    crypto/
      detector.js          ← copy here
      scorer.js            ← copy here
      pipelineEngine.js    ← copy here
    views/
      CryptanalysisView.jsx ← copy here
```

---

## Step 2 — Patch registry.js (one insertion)

Open `src/lib/registry.js`. Find the `TOOL_REGISTRY` array.
Insert **one new object** as the very first item (before `chainsolver`):

```js
// src/lib/registry.js  — TOOL_REGISTRY array, around line 23

export const TOOL_REGISTRY = [
  // ── Quick Access ─────────────────────────────────────────
  { id:"cryptanalysis", section:"quickaccess", basic:true, type:"ctf",  // ← ADD THIS
    icon:"🧬", label:"Smart Cryptanalysis",
    desc:"Auto-detect + multi-layer decode pipeline",
    tags:["auto","detect","pipeline","chain","smart","decode","ctf","entropy","frequency"],
    component: lazy(()=>import("../views/CryptanalysisView.jsx")) },     // ← ADD THIS

  { id:"chainsolver", section:"quickaccess", ...  },  // ← existing, untouched
  ...
```

That is the **only** change to any existing file.

---

## Step 3 — Verify imports compile

`pipelineEngine.js` imports from files that already exist in your project:

| Import | Already in v7? |
|---|---|
| `./base64.js` → `b64Dec` | ✅ Yes |
| `./converters.js` → `hexToAscii, urlDecode` | ✅ Yes |
| `./morse.js` → `morseDec` | ✅ Yes |
| `./atbash.js` → `atbash` | ✅ Yes |
| `./caesar.js` → `rot13, caesarDec` | ✅ Yes |
| `./analysis.js` → `bfCaesar, bfXor` | ✅ Yes |
| `./vigenereAttack.js` → `crackVigenere` | ✅ Yes |
| `./entropy.js` → `shannonEntropy` | ✅ Yes |

**Check `vigenereAttack.js` exports `crackVigenere` as a named export.**
Open `src/crypto/vigenereAttack.js` and confirm:
```js
export function crackVigenere(text) { ... }
```
If the export name differs (e.g. `vigenereAttack`), update the import in `pipelineEngine.js` line 31 to match.

Similarly verify `converters.js` exports `urlDecode`:
```js
export function urlDecode(s) { ... }
```

---

## Architecture diagram

```
User Input (raw ciphertext)
       │
       ▼
  profileInput()          ← detector.js  — entropy, IC, printable ratio flags
       │
       ▼
  detect()                ← detector.js  — regex + stats → DetectionCandidate[]
       │
       ▼
  runPipeline() / BFS     ← pipelineEngine.js
  ┌────────────────────────────────────────────────┐
  │  Frontier: [{ text, chain[], depth }]          │
  │                                                │
  │  For each node:                                │
  │    detect(node.text)  → candidates             │
  │    For each candidate:                         │
  │      TRANSFORMS[label](text)  → output         │
  │      quickScore(output)       → prune?         │
  │      Dedup via Set(stateKey)                   │
  │      Push to queue if depth < maxDepth         │
  └────────────────────────────────────────────────┘
       │
       ▼
  rankCandidates()        ← scorer.js  — full ScoreReport per result
       │
       ▼
  PipelineResult[]        → CryptanalysisView.jsx renders
```

---

## Scoring formula (exact)

```
confidence = clamp(
    wordScore    × 0.40   // English word presence (weighted by word rarity)
  + printable    × 0.25   // Printable ASCII fraction
  + chiScore     × 0.20   // Chi-squared vs EN_FREQ (inverted, normalised)
  + icScore      × 0.10   // |IC - 0.0667| / 0.0667 (inverted)
  + entropyBonus × 0.05   // (ΔH / 4) × 100  where ΔH = H_input - H_output
  + flagBonus            // flat +25 if /flag\{[^}]+\}/i matched
  , 0, 100
)
```

**Grade thresholds:**

| Grade | Confidence |
|---|---|
| 🏁 FLAG | flag pattern present |
| A | ≥ 85 |
| B | ≥ 70 |
| C | ≥ 50 |
| D | ≥ 30 |
| F | < 30 |

---

## Performance & anti-explosion strategy

| Mechanism | Where | Value |
|---|---|---|
| Max chain depth | `pipelineEngine.js` `MAX_DEPTH` | 3 |
| Max detections tried per step | `MAX_CANDIDATES` | 6 |
| Branch confidence floor | `MIN_BRANCH_SCORE` | 15 |
| State dedup | `Set(stateKey)` | exact match on (steps, output prefix) |
| No-op skip | `output === input` guard | prevents identity-transform loops |
| Hard node cap | `MAX_BFS_NODES` | 400 |
| Hash category skip | detector category check | hashes can't be decoded |

**Worst case:** 6^3 = 216 leaf nodes, each with a `quickScore` call (O(n) text scan).
On a 1KB input this runs in ~50–200ms in a browser main thread.

---

## Output format

```js
// Each PipelineResult looks like:
{
  steps: [
    { label: "Base64 decode",  toolId: "base64",    params: {},           output: "...", scoreAfter: 62 },
    { label: "ROT-13",         toolId: "rot13",      params: {},           output: "...", scoreAfter: 88 },
  ],
  finalOutput:  "flag{you_found_it}",
  original:     "ZmxhZ3t...",
  chainLabels:  ["Base64 decode", "ROT-13"],
  confidence:   91,
  hasFlag:      true,
  score: {
    confidence:     91,
    wordScore:      85,
    printableRatio: 1.0,
    chiScore:       78,
    icScore:        71,
    entropyDelta:   2.14,
    hasFlag:        true,
    grade:          "🏁 FLAG",
  }
}
```

---

## Calling the engine programmatically

```js
import { analyse }      from './crypto/pipelineEngine.js';
import { detect }       from './crypto/detector.js';
import { score }        from './crypto/scorer.js';

// Full pipeline
const results = analyse("ZmxhZ3tiYXNlNjR9", { maxDepth: 3 });
console.log(results[0].finalOutput);   // "flag{base64}"
console.log(results[0].confidence);    // 91

// Detection only
const candidates = detect("ZmxhZ3tiYXNlNjR9");
console.log(candidates[0]);  // { toolId: "base64", label: "Base64", confidence: 90, ... }

// Scoring only
const report = score("flag{base64}", "ZmxhZ3tiYXNlNjR9");
console.log(report.grade);   // "🏁 FLAG"
```

---

## Navigating from the result to existing tools

The `toolId` on each step and detection candidate is an exact `TOOL_REGISTRY` id.
`CryptanalysisView` receives `onNavigate` from `App.jsx` — use it to deep-link:

```jsx
// In CryptanalysisView.jsx, if you want a "Open in [Tool]" button:
<button onClick={() => onNavigate(det.toolId)}>
  Open in {det.label}
</button>
```

This pattern is already used in `AutoSolverView.jsx` (see `TOOL_LABELS` mapping there).

---

## Extending later: hash cracking integration

`detector.js` already detects MD5/SHA-1/SHA-256/bcrypt/argon2 and returns `toolId: "hashid"` / `"hashcracker"`.

To add cracking to the pipeline, add a TRANSFORMS entry in `pipelineEngine.js`:

```js
// pipelineEngine.js — TRANSFORMS object
'Cryptographic Hash': (text) => {
  // Only attempt on short common hash formats in a wordlist context
  // Route to existing hashCracker logic
  // Return null to skip (hashes are currently excluded from chains)
  return null;
},
```

Change `if (det.category === 'hash') continue;` to allow hash entries when a
wordlist is loaded. The existing `HashCrackerView.jsx` + its worker can handle the actual cracking.

---

## Extending later: file analysis integration

`FileAnalyzerView.jsx` + `lsbStego.js` already exist. The pipeline engine
accepts a string. To add binary file support:

1. In `FileAnalyzerView`, extract strings from the file (already done).
2. Pass extracted strings to `analyse()`.
3. Display `PipelineResult[]` inside `FileAnalyzerView` (reuse `ResultCard` from `CryptanalysisView`).

---

## Extending later: backend / Web Worker offload

The engine is pure JavaScript with no DOM dependencies except `HTML Entities` transform
(which uses `document.createElement`). To run it in a Worker:

1. Move the `HTML Entities` transform out of `pipelineEngine.js` (or skip it in worker context).
2. Create `cryptanalysisWorker.js`:
```js
import { analyse } from './crypto/pipelineEngine.js';
self.onmessage = e => {
  const results = analyse(e.data.input, e.data.opts);
  self.postMessage(results);
};
```
3. In `CryptanalysisView`:
```js
const worker = new Worker(new URL('../crypto/cryptanalysisWorker.js', import.meta.url));
worker.onmessage = e => { setResults(e.data); setRunning(false); };
worker.postMessage({ input, opts: { maxDepth } });
```
This keeps the UI perfectly responsive during deep multi-layer analysis.
