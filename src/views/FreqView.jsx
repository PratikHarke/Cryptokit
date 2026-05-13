import { useState } from "react";
import { freqAnalysis, ic } from "../crypto/analysis.js";

export default function FreqView({ addHistory }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);

  const run = () => {
    const r = freqAnalysis(text);
    setResults(r);
    addHistory("Frequency Analysis", text.slice(0, 40), `${r.length} chars, top: ${r[0]?.char || "-"}`);
  };

  const maxCount = results.length ? results[0].count : 1;

  return (
    <div>
      <div className="section-header">
        <h3>Frequency Analysis</h3>
        <p>Letter distribution analysis. Compare against English baseline to find substitution patterns.</p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label>Input text</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter ciphertext or plaintext…"
          rows={4}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={run}>Analyze ↗</button>
          {text && (
            <span style={{ fontSize: 11, color: "#64748b" }}>
              IC: {ic(text)} | Letters: {text.replace(/[^a-zA-Z]/g, "").length}
            </span>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="card">
          <div className="card-title">Character Frequency vs English Expected</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "0 20px" }}>
            {results.map(r => (
              <div key={r.char} className="freq-row">
                <span style={{ width: 14, fontWeight: 600, color: "#93c5fd", fontSize: 13 }}>{r.char}</span>
                <div style={{ flex: 1 }}>
                  <div className="freq-bar">
                    <div className="freq-fill" style={{ width: `${(r.count / maxCount) * 100}%` }} />
                  </div>
                  <div className="freq-bar" style={{ marginTop: 2 }}>
                    <div className="freq-fill expected" style={{ width: `${(parseFloat(r.expected) / 12.7) * 100}%` }} />
                  </div>
                </div>
                <span style={{ width: 36, textAlign: "right", color: "#64748b" }}>{r.pct}%</span>
                <span style={{ width: 32, textAlign: "right", color: "#475569", fontSize: 11 }}>{r.expected}%</span>
              </div>
            ))}
          </div>
          <div className="info-box" style={{ marginTop: 10 }}>
            <span style={{ color: "#3b82f6" }}>█</span> Observed &nbsp;&nbsp;
            <span style={{ color: "#475569" }}>█</span> English expected &nbsp;&nbsp;
            IC {ic(text)} (English ≈ 0.065, random ≈ 0.038)
          </div>
        </div>
      )}
    </div>
  );
}
