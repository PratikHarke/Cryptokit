import { useState } from "react";
import { rc4Encrypt, rc4Decrypt, rc4KeystreamBytes } from "../crypto/rc4.js";
import { CopyBtn } from "../components/Output.jsx";

export default function RC4View({ addHistory }) {
  const [mode, setMode]   = useState("encrypt");
  const [input, setInput] = useState("");
  const [key, setKey]     = useState("");
  const [result, setResult] = useState(null);
  const [showKs, setShowKs] = useState(false);

  const run = () => {
    if (!input.trim() || !key.trim()) return;
    if (mode === "encrypt") {
      const r = rc4Encrypt(input, key);
      if (r.error) { setResult({ error: r.error }); return; }
      setResult({ output: r.hex, keystream: r.keystream, type: "hex" });
      addHistory?.("RC4 Encrypt", input, r.hex);
    } else {
      const r = rc4Decrypt(input, key);
      if (r.error) { setResult({ error: r.error }); return; }
      setResult({ output: r.text, keystream: r.keystream, type: "text" });
      addHistory?.("RC4 Decrypt", input, r.text);
    }
  };

  const ks = key ? rc4KeystreamBytes(key, 32) : [];

  return (
    <div>
      <div className="section-header">
        <h3>RC4 Stream Cipher</h3>
        <p>RC4 generates a pseudorandom keystream XOR'd with plaintext. Common in older TLS/WEP — now deprecated.</p>
      </div>

      <div className="grid2" style={{ marginBottom: 12 }}>
        <div className="card">
          <div className="card-title">Mode</div>
          <div className="tab-bar" style={{ marginBottom: 12 }}>
            {["encrypt", "decrypt"].map(m => (
              <button key={m} className={`tab${mode === m ? " active" : ""}`} onClick={() => { setMode(m); setResult(null); }}>
                {m === "encrypt" ? "Encrypt → Hex" : "Decrypt (Hex → Text)"}
              </button>
            ))}
          </div>

          <label>Input {mode === "decrypt" ? "(hex)" : "(plaintext)"}</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={mode === "encrypt" ? "Enter plaintext…" : "Enter hex ciphertext…"}
            style={{ marginBottom: 10 }}
          />

          <label>Key (any ASCII string)</label>
          <input
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="Enter key…"
            style={{ marginBottom: 10 }}
          />

          <button className="btn btn-primary" onClick={run} style={{ width: "100%" }}>
            {mode === "encrypt" ? "🔐 Encrypt" : "🔓 Decrypt"}
          </button>
        </div>

        <div className="card">
          <div className="card-title">Output</div>
          {result?.error && (
            <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>{result.error}</div>
          )}
          {result && !result.error && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ margin: 0 }}>Result ({result.type})</label>
                <CopyBtn text={result.output} />
              </div>
              <div className="output" style={{ marginBottom: 12, color: mode === "encrypt" ? "#fbbf24" : "#86efac" }}>
                {result.output}
              </div>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowKs(v => !v)}
                style={{ marginBottom: showKs ? 8 : 0 }}
              >
                {showKs ? "▾" : "▸"} First 32 keystream bytes
              </button>
              {showKs && (
                <div className="output mono" style={{ fontSize: 11 }}>
                  {result.keystream.slice(0, 32).map(b => b.toString(16).padStart(2, "0")).join(" ")}
                </div>
              )}
            </>
          )}
          {!result && (
            <div style={{ color: "#334155", fontSize: 13 }}>Output appears here…</div>
          )}
        </div>
      </div>

      {/* Keystream preview */}
      {key && (
        <div className="card">
          <div className="card-title">Keystream Preview (first 32 bytes for key: "{key}")</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {ks.map((b, i) => (
              <div key={i} style={{
                background: "#1e293b", borderRadius: 4, padding: "4px 6px",
                fontFamily: "monospace", fontSize: 11,
                color: `hsl(${(b * 360 / 256) | 0}, 70%, 65%)`,
                minWidth: 36, textAlign: "center",
              }}>
                {b.toString(16).padStart(2, "0")}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>
            RC4 KSA + PRGA generates this deterministic stream from your key — XOR'd with plaintext byte-by-byte.
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">Security Notes</div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
          ⚠️ <b style={{ color: "#fbbf24" }}>RC4 is broken</b> — never use in production. Known attacks include:<br />
          • <b>Fluhrer-Mantin-Shamir (FMS)</b>: key recovery from biased output (broke WEP)<br />
          • <b>Royal Holloway</b>: distinguishing attack on first 256 bytes<br />
          • <b>NOMORE</b>: practical cookie recovery in HTTPS/TLS<br />
          • <b>Two-time pad</b>: reusing key XOR's two plaintexts together — catastrophic
        </div>
      </div>
    </div>
  );
}
