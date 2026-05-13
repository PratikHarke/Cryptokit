import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// AES Block Mode Explorer — EDUCATIONAL SIMULATOR
//
// ECB is simulated by encrypting each 16-byte block independently via
// AES-CBC with a zero IV. This is mathematically equivalent to ECB for a
// single block (CBC block 0 = AES(plaintext XOR IV) = AES(plaintext) when
// IV = 0). It is NOT a production ECB implementation; it exists only to
// make the pattern-leakage weakness visible.
//
// The Web Crypto API does not expose AES-ECB directly — by design.
// ─────────────────────────────────────────────────────────────────────────────

const BLOCK_SIZE = 16;

// Simulate ECB: encrypt each block independently (CBC with IV=0 per block)
async function simulateECB(plainBytes, key) {
  const ck = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["encrypt"]);
  const results = [];
  for (let i = 0; i < plainBytes.length; i += BLOCK_SIZE) {
    const block = new Uint8Array(BLOCK_SIZE);
    block.set(plainBytes.slice(i, i + BLOCK_SIZE));  // zero-pad last block
    const zeroIV = new Uint8Array(BLOCK_SIZE);        // IV=0 → no chaining
    const enc = await crypto.subtle.encrypt({ name: "AES-CBC", iv: zeroIV }, ck, block);
    results.push(...new Uint8Array(enc).slice(0, BLOCK_SIZE));
  }
  return new Uint8Array(results);
}

async function realCBC(plainBytes, key, iv) {
  const ck = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["encrypt"]);
  const padded = new Uint8Array(Math.ceil(plainBytes.length / BLOCK_SIZE) * BLOCK_SIZE);
  padded.set(plainBytes);
  const enc = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, ck, padded);
  return new Uint8Array(enc);
}

// ─── Block display ────────────────────────────────────────────────────────────

function blockHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function blockColor(bytes) {
  const r = Math.round((bytes[0] || 0) * 0.5 + 60);
  const g = Math.round((bytes[1] || 0) * 0.3 + 40);
  const b = Math.round((bytes[2] || 0) * 0.5 + 80);
  return `rgb(${r},${g},${b})`;
}

function BlockGrid({ label, sublabel, blocks, highlightDupes, accentColor }) {
  const dupeMap = {};
  if (highlightDupes) {
    blocks.forEach((block, i) => {
      const k = blockHex(block);
      (dupeMap[k] = dupeMap[k] || []).push(i);
    });
  }
  const dupeCount = Object.values(dupeMap).filter(v => v.length > 1).length;

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: accentColor, letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8 }}>{sublabel}</div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        {blocks.map((block, i) => {
          const k = blockHex(block);
          const isDupe = highlightDupes && dupeMap[k]?.length > 1;
          return (
            <div
              key={i}
              title={`Block ${i}: ${k.slice(0, 16)}…`}
              style={{
                width: 34, height: 34, borderRadius: 4,
                background: isDupe ? "#7f1d1d" : blockColor(block),
                border: isDupe ? "2px solid #f87171" : "1px solid #1e293b",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, color: "rgba(255,255,255,0.7)", fontFamily: "monospace",
                cursor: "default",
              }}
            >
              {i}
            </div>
          );
        })}
      </div>
      {highlightDupes && (
        <div style={{ marginTop: 8, fontSize: 11 }}>
          {dupeCount > 0
            ? <span style={{ color: "#f87171" }}>⚠ {dupeCount} duplicate block{dupeCount !== 1 ? "s" : ""} — pattern visible without the key</span>
            : <span style={{ color: "#86efac" }}>✓ No duplicate blocks detected</span>
          }
        </div>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function AESBlockView({ addHistory }) {
  const DEFAULT_INPUT = "AAAAAAAAAAAAAAAA AAAAAAAAAAAAAAAA AAAAAAAAAAAAAAAA Hello World 1234 Hello World 1234";
  const [input, setInput]         = useState(DEFAULT_INPUT);
  const [plainBlocks, setPlainBlocks] = useState([]);
  const [ecbBlocks, setEcbBlocks]   = useState([]);
  const [cbcBlocks, setCbcBlocks]   = useState([]);
  const [error, setError]           = useState("");
  const [tab, setTab]               = useState("compare");
  const [busy, setBusy]             = useState(false);

  const run = async () => {
    setError("");
    setBusy(true);
    try {
      const plain = new TextEncoder().encode(input.replace(/\s+/g, " "));

      // Deterministic demo key + IV — not secret, not secure, for visualization only
      const key = new Uint8Array(16).fill(0x42);
      const iv  = new Uint8Array(16).fill(0x00);

      // Split plaintext into 16-byte blocks
      const pBlocks = [];
      for (let i = 0; i < plain.length; i += BLOCK_SIZE) {
        pBlocks.push(plain.slice(i, Math.min(i + BLOCK_SIZE, plain.length)));
      }
      setPlainBlocks(pBlocks);

      const ecbRaw = await simulateECB(plain, key);
      const ecbSplit = [];
      for (let i = 0; i < ecbRaw.length; i += BLOCK_SIZE) ecbSplit.push(ecbRaw.slice(i, i + BLOCK_SIZE));
      setEcbBlocks(ecbSplit);

      const cbcRaw = await realCBC(plain, key, iv);
      const cbcSplit = [];
      for (let i = 0; i < cbcRaw.length; i += BLOCK_SIZE) cbcSplit.push(cbcRaw.slice(i, i + BLOCK_SIZE));
      setCbcBlocks(cbcSplit);

      addHistory(
        "AES block explorer",
        `${pBlocks.length} blocks · input: ${input.slice(0, 40)}`,
        `ECB blocks: ${ecbSplit.length}, CBC blocks: ${cbcSplit.length}`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="section-header">
        <h3>AES block mode explorer</h3>
        <p>
          Visualize why ECB mode leaks plaintext structure. Identical plaintext blocks produce identical
          ciphertext blocks — the pattern survives encryption.
        </p>
      </div>

      {/* Educational disclaimer */}
      <div className="info-box" style={{ marginBottom: 12, borderColor: "#a78bfa44" }}>
        <strong style={{ color: "#a78bfa" }}>Learning visualization only.</strong>{" "}
        The ECB simulation uses AES-CBC with IV = 0 per block, which is mathematically equivalent for single-block
        operations. The Web Crypto API does not expose AES-ECB by design — because it's insecure.
        Keys and IVs here are fixed demo values, not cryptographically safe.
      </div>

      <div className="tabs-wrap">
        {[["compare", "ECB vs CBC"], ["explain", "Mode reference"]].map(([id, label]) => (
          <button key={id} className={`tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "compare" && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <label>
              Plaintext — repeat 16-character phrases to expose the ECB weakness
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              rows={3}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={run} disabled={busy}>
                {busy ? "Encrypting…" : "Encrypt & visualize"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setInput(DEFAULT_INPUT)}>
                Reset example
              </button>
            </div>
          </div>

          {error && <div style={{ color: "#f87171", marginBottom: 12, fontSize: 13 }}>{error}</div>}

          {ecbBlocks.length > 0 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div className="card">
                  <BlockGrid
                    label="Plaintext blocks"
                    sublabel="16 bytes each · hover for hex"
                    blocks={plainBlocks}
                    highlightDupes={true}
                    accentColor="#94a3b8"
                  />
                </div>
                <div className="card">
                  <BlockGrid
                    label="ECB (simulated)"
                    sublabel="Each block encrypted independently — no chaining"
                    blocks={ecbBlocks}
                    highlightDupes={true}
                    accentColor="#f87171"
                  />
                  <div className="info-box" style={{ marginTop: 10, borderColor: "#ef444444" }}>
                    Duplicate plaintext blocks → duplicate ciphertext blocks. The attacker sees the pattern without the key.
                  </div>
                </div>
              </div>

              <div className="card">
                <BlockGrid
                  label="CBC (real AES-CBC)"
                  sublabel="Each block XOR'd with previous ciphertext before encryption"
                  blocks={cbcBlocks}
                  highlightDupes={true}
                  accentColor="#86efac"
                />
                <div className="info-box" style={{ marginTop: 10, borderColor: "#22c55e44" }}>
                  Identical plaintext blocks produce different ciphertext blocks. Structure is hidden.
                </div>
              </div>

              <div className="card" style={{ marginTop: 12 }}>
                <div className="card-title">Block counts</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {[
                    ["Plaintext", plainBlocks.length],
                    ["ECB output", ecbBlocks.length],
                    ["CBC output", cbcBlocks.length],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: "#070b16", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#475569" }}>{k}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#60a5fa" }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === "explain" && (
        <div className="card">
          <div className="card-title">AES mode reference</div>
          {[
            {
              name: "ECB — Electronic Codebook",
              color: "#f87171",
              how: "Each 16-byte block encrypted independently with the same key.",
              weakness: "Identical plaintext → identical ciphertext. Pattern survives encryption. Block reordering and replay attacks are trivial.",
              ctf: "ECB oracle attacks, byte-at-a-time decryption, block reordering to forge authenticated requests.",
            },
            {
              name: "CBC — Cipher Block Chaining",
              color: "#86efac",
              how: "Each block XOR'd with the previous ciphertext block before encryption. First block uses a random IV.",
              weakness: "IV reuse breaks security. Padding oracle attacks (e.g. POODLE) can decrypt ciphertext byte-by-byte if a server leaks padding validity.",
              ctf: "Bit-flip attacks on IV to control first block. Padding oracle: flip bits in ciphertext to control decryption of next block.",
            },
            {
              name: "CTR — Counter mode",
              color: "#93c5fd",
              how: "Encrypts a counter value, XOR'd with plaintext. Turns AES into a stream cipher. No padding needed.",
              weakness: "Nonce reuse is catastrophic: same nonce + key = same keystream. Two ciphertexts XOR together cancel the key.",
              ctf: "Nonce reuse → XOR ciphertexts together, crib-drag to recover plaintext. Fixed-nonce multi-message attacks.",
            },
          ].map(({ name, color, how, weakness, ctf }) => (
            <div key={name} style={{ padding: "14px 0", borderBottom: "1px solid #1e293b" }}>
              <div style={{ fontWeight: 700, color, marginBottom: 8, fontSize: 13 }}>{name}</div>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "4px 8px", fontSize: 12, lineHeight: 1.6 }}>
                <span style={{ color: "#475569" }}>How:</span>
                <span style={{ color: "#e2e8f0" }}>{how}</span>
                <span style={{ color: "#475569" }}>Weakness:</span>
                <span style={{ color: "#fbbf24" }}>{weakness}</span>
                <span style={{ color: "#475569" }}>CTF use:</span>
                <span style={{ color: "#a78bfa" }}>{ctf}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
