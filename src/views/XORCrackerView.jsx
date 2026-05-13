import { useState } from "react";
import { crackRepeatingXor, xorHexStrings, cribDrag } from "../crypto/xorAdvanced.js";
import { CopyBtn } from "../components/Output.jsx";

// ─── Crack Tab ────────────────────────────────────────────────────────────────

function CrackTab({ addHistory }) {
  const [hex, setHex] = useState("");
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(0);

  const run = () => {
    const r = crackRepeatingXor(hex);
    setResult(r);
    setSelected(0);
    if (r.results?.[0]) {
      addHistory("XOR Cracker", hex.slice(0, 20),
        `Key "${r.results[0].keyStr}" → ${r.results[0].decrypted.slice(0, 30)}`);
    }
  };

  const best = result?.results?.[selected];

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <label>Hex ciphertext (repeating-key XOR)</label>
        <textarea
          value={hex}
          onChange={e => { setHex(e.target.value); setResult(null); }}
          placeholder={"e.g.\n0b3637272a2b2e63622c2e69692a23693a2a3c6324202d623d63343c2a26226324272765272\na2282b2f20430a652e2c652a3124333a653e2b2027630c692b20283165286326302e27282f"}
          rows={5}
          style={{ fontFamily: "monospace", fontSize: 12 }}
        />
        <button className="btn btn-primary" style={{ marginTop: 10, width: "100%" }} onClick={run}>
          Crack Repeating-Key XOR ↗
        </button>
      </div>

      {result?.error && (
        <div className="card">
          <div style={{ color: "#ef4444", fontSize: 13 }}>{result.error}</div>
        </div>
      )}

      {result?.results?.length > 0 && (
        <>
          {/* Key length candidates */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-title">Key Length Candidates (by edit distance score, lower = better)</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {result.results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  style={{
                    padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 600,
                    background: selected === i ? "#1d4ed8" : "#1e293b",
                    color: selected === i ? "#fff" : "#94a3b8",
                    transition: ".15s",
                  }}
                >
                  keylen={r.keyLen}
                  <span style={{ fontSize: 10, fontWeight: 400, display: "block", color: selected === i ? "#93c5fd" : "#475569" }}>
                    dist={r.editDistScore}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Best result detail */}
          {best && (
            <div className="card">
              <div className="card-title">Recovered Key — Length {best.keyLen}</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  ["Key (string)", best.keyStr],
                  ["Key (hex)", best.keyHex],
                  ["Key length", best.keyLen + " bytes"],
                  ["Text score", Math.round(best.textScore)],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "#070b16", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24", fontFamily: "monospace", wordBreak: "break-all" }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px" }}>Decrypted plaintext</span>
                <CopyBtn text={best.decrypted} />
              </div>
              <div style={{
                background: "#070b16", border: "1px solid #22c55e33", borderRadius: 6,
                padding: "10px 12px", fontFamily: "monospace", fontSize: 12.5,
                color: "#86efac", wordBreak: "break-all", whiteSpace: "pre-wrap",
                lineHeight: 1.6, maxHeight: 200, overflowY: "auto",
              }}>
                {best.decrypted}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Crib Drag Tab ────────────────────────────────────────────────────────────

function CribTab({ addHistory }) {
  const [hex1, setHex1] = useState("");
  const [hex2, setHex2] = useState("");
  const [crib, setCrib] = useState("the");
  const [xorResult, setXorResult] = useState(null);
  const [dragResult, setDragResult] = useState(null);

  const doXor = () => {
    const r = xorHexStrings(hex1, hex2);
    setXorResult(r);
    setDragResult(null);
  };

  const doDrag = () => {
    if (!xorResult?.hex) return;
    const r = cribDrag(xorResult.hex, crib);
    setDragResult(r);
    addHistory("Crib Drag", `crib="${crib}"`, `${r.filter(x => x.isPrintable).length} printable hits`);
  };

  return (
    <div>
      <div className="info-box" style={{ marginBottom: 12 }}>
        <b style={{ color: "#93c5fd" }}>Two-time pad attack:</b> If two messages were XOR'd with
        the same key, XOR them together to cancel the key. Then slide a known word (crib) across
        to recover plaintext at matching offsets.
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 10 }}>
          <label>Ciphertext 1 (hex)</label>
          <textarea value={hex1} onChange={e => setHex1(e.target.value)} rows={2} style={{ fontFamily: "monospace", fontSize: 12 }} placeholder="hex..." />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Ciphertext 2 (hex)</label>
          <textarea value={hex2} onChange={e => setHex2(e.target.value)} rows={2} style={{ fontFamily: "monospace", fontSize: 12 }} placeholder="hex..." />
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={doXor}>XOR Together ↗</button>
      </div>

      {xorResult?.error && (
        <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{xorResult.error}</div>
      )}

      {xorResult?.hex && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title">XOR Result</div>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: "#93c5fd", wordBreak: "break-all", marginBottom: 8 }}>
            {xorResult.hex}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: "#94a3b8", wordBreak: "break-all" }}>
            ASCII: {xorResult.ascii}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label>Crib word (known plaintext)</label>
              <input value={crib} onChange={e => setCrib(e.target.value)} placeholder="the, flag, CTF{..." />
            </div>
            <button className="btn btn-primary" onClick={doDrag} style={{ flexShrink: 0 }}>Drag ↗</button>
          </div>
        </div>
      )}

      {dragResult && (
        <div className="card">
          <div className="card-title">
            Crib Drag Results — {dragResult.filter(r => r.isPrintable).length} printable offsets
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {dragResult.filter(r => r.isPrintable).map((r, i) => (
              <div key={i} style={{
                display: "flex", gap: 12, alignItems: "center",
                padding: "5px 0", borderBottom: "1px solid #0f172a", fontSize: 12,
              }}>
                <span style={{ color: "#60a5fa", fontWeight: 600, minWidth: 60 }}>offset {r.offset}</span>
                <span style={{ fontFamily: "monospace", color: "#86efac", flex: 1 }}>{r.ascii}</span>
              </div>
            ))}
            {dragResult.filter(r => r.isPrintable).length === 0 && (
              <div style={{ color: "#475569", padding: "10px 0", fontSize: 13 }}>
                No fully printable offsets found. Try a different crib.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function XORCrackerView({ addHistory }) {
  const [tab, setTab] = useState("crack");

  return (
    <div>
      <div className="section-header">
        <h3>XOR Cracker</h3>
        <p>Repeating-key attack via normalized edit distance + column bruteforce. Crib drag for two-time pad.</p>
      </div>

      <div className="tabs-wrap">
        {[["crack", "Repeating-Key Crack"], ["crib", "Crib Drag (Two-Time Pad)"]].map(([id, label]) => (
          <button key={id} className={`tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "crack" ? <CrackTab addHistory={addHistory} /> : <CribTab addHistory={addHistory} />}
    </div>
  );
}
