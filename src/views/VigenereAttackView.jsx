import { useState } from "react";
import { crackVigenere, kasiskiTest, columnIC } from "../crypto/vigenereAttack.js";
import { ic } from "../crypto/analysis.js";
import { vigDec } from "../crypto/vigenere.js";
import { CopyBtn } from "../components/Output.jsx";

export default function VigenereAttackView({ addHistory }) {
  const [ciphertext, setCiphertext] = useState("");
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(0);
  const [manualKey, setManualKey] = useState("");
  const [manualOut, setManualOut] = useState("");

  const run = () => {
    const r = crackVigenere(ciphertext);
    setResult(r);
    setSelected(0);
    if (r.results?.[0]) {
      addHistory("Vigenère Crack", ciphertext.slice(0, 30),
        `Key: "${r.results[0].key}" → "${r.results[0].decrypted.slice(0, 30)}"`);
    }
  };

  const tryManual = () => {
    if (!manualKey || !ciphertext) return;
    setManualOut(vigDec(ciphertext, manualKey));
  };

  const best = result?.results?.[selected];

  return (
    <div>
      <div className="section-header">
        <h3>Vigenère Auto-Crack</h3>
        <p>
          Kasiski test finds repeated n-grams to estimate key length.
          Index of Coincidence confirms the best candidate.
          Column-wise chi-squared recovers the key character by character.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label>Ciphertext (need 100+ letters for reliable results)</label>
        <textarea
          value={ciphertext}
          onChange={e => { setCiphertext(e.target.value); setResult(null); }}
          placeholder="Paste Vigenère ciphertext here…"
          rows={5}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={run}>
            Auto-Crack ↗
          </button>
          {ciphertext && (
            <span style={{ fontSize: 11, color: "#64748b" }}>
              IC: {ic(ciphertext)} | Letters: {ciphertext.replace(/[^a-zA-Z]/g, "").length}
            </span>
          )}
        </div>
      </div>

      {result?.error && (
        <div className="card">
          <div style={{ color: "#ef4444", fontSize: 13 }}>{result.error}</div>
        </div>
      )}

      {result && !result.error && (
        <>
          {/* Kasiski results */}
          {result.kasinski.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Kasiski Test — Repeated Trigram Distances</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.kasinski.slice(0, 8).map(({ len, count }) => (
                  <div key={len} style={{
                    background: "#1e293b", borderRadius: 6, padding: "6px 12px",
                    fontSize: 12, textAlign: "center",
                  }}>
                    <div style={{ fontWeight: 700, color: "#93c5fd", fontSize: 15 }}>{len}</div>
                    <div style={{ color: "#475569", fontSize: 10 }}>{count} vote{count !== 1 ? "s" : ""}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>
                Higher vote count = stronger Kasiski signal for that key length.
                {result.totalLetters} letters analyzed.
              </div>
            </div>
          )}

          {/* Key length candidates */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-title">Top Key Length Candidates (by average IC)</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {result.results.map((r, i) => {
                const icVal = parseFloat(r.avgIC);
                const icGood = icVal > 0.055;
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    style={{
                      padding: "8px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                      background: selected === i ? "#1d4ed8" : "#1e293b",
                      color: selected === i ? "#fff" : "#94a3b8",
                      fontSize: 12, fontWeight: 600, transition: ".15s", textAlign: "center",
                    }}
                  >
                    <div>keylen = {r.keyLen}</div>
                    <div style={{ fontSize: 10, fontWeight: 400, color: selected === i ? "#93c5fd" : (icGood ? "#86efac" : "#f87171") }}>
                      IC={r.avgIC} {icGood ? "✓" : "✗"}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 400, color: selected === i ? "#bfdbfe" : "#475569" }}>
                      {r.kasVotes} Kasiski votes
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="info-box">
              English IC ≈ 0.065. Random ≈ 0.038.
              A column IC above 0.055 strongly suggests the correct key length.
            </div>
          </div>

          {/* Best result detail */}
          {best && (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Recovered Key — Length {best.keyLen}</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {[
                    ["Key", best.key],
                    ["Avg column IC", best.avgIC],
                    ["Kasiski votes", best.kasVotes],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: "#070b16", borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>{k}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24", fontFamily: "monospace" }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Column breakdown */}
                <div className="card-title" style={{ marginBottom: 6 }}>Column-by-Column Key Recovery</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {best.columnDetails.map(({ col, keyChar, chi }) => (
                    <div key={col} style={{
                      background: "#070b16", borderRadius: 6, padding: "6px 10px",
                      textAlign: "center", minWidth: 52,
                    }}>
                      <div style={{ fontSize: 10, color: "#475569" }}>col {col}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#93c5fd", fontFamily: "monospace" }}>{keyChar}</div>
                      <div style={{ fontSize: 9, color: "#475569" }}>χ²={chi}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div className="card-title" style={{ margin: 0 }}>Decrypted Plaintext</div>
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
            </>
          )}

          {/* Manual key override */}
          <div className="card">
            <div className="card-title">Manual Key Override</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={manualKey}
                onChange={e => setManualKey(e.target.value.toUpperCase())}
                placeholder="Try your own key…"
                style={{ flex: 1, fontFamily: "monospace", letterSpacing: 2 }}
              />
              <button className="btn btn-primary" onClick={tryManual}>Decrypt</button>
            </div>
            {manualOut && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>Output with key "{manualKey}"</span>
                  <CopyBtn text={manualOut} />
                </div>
                <div style={{
                  background: "#070b16", border: "1px solid #1e293b", borderRadius: 6,
                  padding: "8px 12px", fontFamily: "monospace", fontSize: 12.5,
                  color: "#e2e8f0", wordBreak: "break-all", whiteSpace: "pre-wrap",
                }}>
                  {manualOut}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
