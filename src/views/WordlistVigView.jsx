import { useState } from "react";
import { wordlistVigenereAttack } from "../crypto/wordlistVigenere.js";
import { CopyBtn } from "../components/Output.jsx";

export default function WordlistVigView({ addHistory }) {
  const [ciphertext, setCiphertext] = useState("");
  const [custom, setCustom] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = () => {
    setLoading(true);
    setTimeout(() => {
      const customWords = custom.split(/[\n,\s]+/).map(w => w.trim()).filter(Boolean);
      const r = wordlistVigenereAttack(ciphertext, customWords);
      setResults(r);
      setLoading(false);
      const best = r[0];
      addHistory("Vigenère Wordlist", ciphertext.slice(0, 30),
        best ? `Key "${best.key}" → ${best.decrypted.slice(0, 30)}` : "No matches");
    }, 50);
  };

  const maxScore = results?.length ? results[0].score : 1;

  return (
    <div>
      <div className="section-header">
        <h3>Vigenère Wordlist Attack</h3>
        <p>
          Tries ~600 common English words + CTF-style keywords as Vigenère keys.
          Works when Kasiski/IC analysis fails on short ciphertexts or unusual key choices.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 10 }}>
          <label>Ciphertext</label>
          <textarea value={ciphertext} onChange={e => { setCiphertext(e.target.value); setResults(null); }}
            placeholder="Paste Vigenère ciphertext…" rows={4} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Additional keys to try (one per line or comma-separated)</label>
          <textarea value={custom} onChange={e => setCustom(e.target.value)}
            placeholder={"company\nproductname\nyear2024"} rows={3} />
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={run} disabled={loading}>
          {loading ? "Trying keys…" : "Attack ↗"}
        </button>
      </div>

      {results && results.length === 0 && (
        <div className="card">
          <div style={{ color: "#64748b", fontSize: 13 }}>
            No candidates scored above threshold. Try:
            <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Adding custom words above (company name, theme of CTF, etc.)</li>
              <li>Using the Vigenère Crack tool for longer ciphertexts (Kasiski analysis)</li>
              <li>Checking if it's actually a different cipher (try Auto-Solver)</li>
            </ul>
          </div>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div className="card-title" style={{ margin: 0 }}>
              Top {results.length} Candidates
            </div>
            {results.some(r => r.hasFlag) && (
              <span style={{ color: "#86efac", fontWeight: 700, fontSize: 13 }}>🏁 Flag pattern found!</span>
            )}
          </div>

          {results.map((r, i) => (
            <div key={i} style={{
              padding: "10px 0", borderBottom: "1px solid #0f172a",
              background: r.hasFlag ? "#14532d11" : "transparent",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: r.hasFlag ? "#86efac" : "#60a5fa", fontSize: 12 }}>
                  {r.hasFlag ? "🏁 " : ""}Key: <span style={{ fontFamily: "monospace" }}>"{r.key}"</span>
                </span>
                <span style={{ fontSize: 11, color: "#475569" }}>score {Math.round(r.score)}</span>
              </div>
              <div style={{ fontSize: 12, color: "#e2e8f0", fontFamily: "monospace", wordBreak: "break-all", marginBottom: 4 }}>
                {r.decrypted.slice(0, 100)}{r.decrypted.length > 100 ? "…" : ""}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <CopyBtn text={r.key} />
                <CopyBtn text={r.decrypted} />
              </div>
              <div style={{ height: 3, background: "#1e293b", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                <div style={{ width: `${(r.score / Math.max(maxScore, 1)) * 100}%`, height: "100%", background: r.hasFlag ? "#22c55e" : "#3b82f6", transition: ".3s" }} />
              </div>
            </div>
          ))}

          <div className="info-box" style={{ marginTop: 10 }}>
            Score = English word frequency (common words × 25) + chi-squared letter distribution.
            Flag pattern detection runs independently — any key producing <code style={{ color: "#fbbf24" }}>flag&#123;…&#125;</code> is highlighted.
          </div>
        </div>
      )}
    </div>
  );
}
