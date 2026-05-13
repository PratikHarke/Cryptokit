import { useState } from "react";
import { bfCaesar } from "../crypto/analysis.js";

export default function BFCaesarView({ addHistory }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);

  const run = () => {
    const r = bfCaesar(text);
    setResults(r);
    addHistory(
      "Caesar Bruteforce",
      text.slice(0, 40),
      `Top: shift=${r[0]?.shift}: ${r[0]?.text?.slice(0, 30)}`
    );
  };

  const maxScore = results.length ? Math.max(...results.map(r => r.score)) : 1;

  return (
    <div>
      <div className="section-header">
        <h3>Caesar Bruteforce</h3>
        <p>Tries all 26 shifts and scores by English chi-squared + common word frequency.</p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label>Ciphertext</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter ciphertext…"
          rows={3}
        />
        <button
          className="btn btn-primary"
          style={{ marginTop: 10, width: "100%" }}
          onClick={run}
        >
          Bruteforce All 26 Shifts ↗
        </button>
      </div>

      {results.length > 0 && (
        <div className="card">
          <div className="card-title">Results (best match first)</div>
          {results.map(r => (
            <div key={r.shift} style={{ padding: "7px 0", borderBottom: "1px solid #0f172a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: "#60a5fa", fontWeight: 600, fontSize: 12 }}>
                  Shift {r.shift.toString().padStart(2, " ")}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>score {Math.round(r.score)}</span>
              </div>
              <div style={{ fontSize: 12, color: "#e2e8f0", fontFamily: "monospace", wordBreak: "break-all" }}>
                {r.text.slice(0, 80)}
              </div>
              <div className="score-bar">
                <div className="score-fill" style={{ width: `${Math.max(0, (r.score / maxScore) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
