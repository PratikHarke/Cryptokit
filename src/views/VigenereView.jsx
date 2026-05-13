import { useState } from "react";
import Output from "../components/Output.jsx";
import { vigEnc, vigDec } from "../crypto/vigenere.js";
import { ic } from "../crypto/analysis.js";

export default function VigenereView({ addHistory }) {
  const [text, setText] = useState("");
  const [key, setKey] = useState("");
  const [mode, setMode] = useState("enc");

  const out = text && key ? (mode === "enc" ? vigEnc(text, key) : vigDec(text, key)) : "";
  const run = () => addHistory("Vigenère " + (mode === "enc" ? "Encrypt" : "Decrypt"), text.slice(0, 40), out);

  return (
    <div>
      <div className="section-header">
        <h3>Vigenère Cipher</h3>
        <p>Polyalphabetic substitution using a repeating keyword. IC ≈ 0.065 for English.</p>
      </div>

      <div className="tabs-wrap">
        {["enc", "dec"].map(m => (
          <button key={m} className={`tab${mode === m ? " active" : ""}`} onClick={() => setMode(m)}>
            {m === "enc" ? "Encrypt" : "Decrypt"}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 10 }}>
          <label>Input text</label>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter text…" rows={4} />
        </div>
        <div className="row">
          <div>
            <label>Keyword</label>
            <input value={key} onChange={e => setKey(e.target.value)} placeholder="e.g. SECRET" />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={run}>Run ↗</button>
          </div>
        </div>
        {text && <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>IC: {ic(text)}</div>}
      </div>

      <div className="card">
        <div className="card-title">Output</div>
        <Output value={out} />
      </div>
    </div>
  );
}
