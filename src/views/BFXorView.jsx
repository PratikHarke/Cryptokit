import { useState } from "react";
import { bfXor } from "../crypto/analysis.js";

export default function BFXorView({ addHistory }) {
  const [hex, setHex] = useState("");
  const [results, setResults] = useState([]);

  const run = () => {
    const r = bfXor(hex);
    setResults(r);
    if (r[0]) addHistory("XOR Bruteforce", hex.slice(0, 20), `Key ${r[0].keyHex}: ${r[0].text?.slice(0, 30)}`);
  };

  const maxScore = results.length ? Math.max(...results.map(r => r.score)) : 1;

  return (
    <div>
      <div className="section-header">
        <h3>XOR Single-Byte Bruteforce</h3>
        <p>Tries all 256 single-byte XOR keys and scores outputs by English likelihood.</p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label>Hex ciphertext</label>
        <textarea
          value={hex}
          onChange={e => setHex(e.target.value)}
          placeholder="e.g. 1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b3736"
          rows={3}
          style={{ fontFamily: "monospace" }}
        />
        <button
          className="btn btn-primary"
          style={{ marginTop: 10, width: "100%" }}
          onClick={run}
        >
          Bruteforce 256 Keys ↗
        </button>
      </div>

      {results.length > 0 && (
        <div className="card">
          <div className="card-title">Top Candidates</div>
          {results.slice(0, 10).map((r, i) => (
            <div key={i} style={{ padding: "7px 0", borderBottom: "1px solid #0f172a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: "#fbbf24", fontWeight: 600, fontSize: 12 }}>
                  Key {r.keyHex} ({r.key})
                </span>
                <span style={{ fontSize: 11, color: "#475569" }}>score {Math.round(r.score)}</span>
              </div>
              <div style={{ fontSize: 12, color: "#e2e8f0", fontFamily: "monospace", wordBreak: "break-all" }}>
                {r.text.slice(0, 80)}
              </div>
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${Math.max(0, (r.score / maxScore) * 100)}%`, background: "#f59e0b" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
