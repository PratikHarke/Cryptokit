import { useState } from "react";
import Output from "../components/Output.jsx";
import { xorEnc, xorDec } from "../crypto/xor.js";

export default function XORView({ addHistory }) {
  const [text, setText] = useState("");
  const [key, setKey] = useState("");
  const [mode, setMode] = useState("enc");

  const out = text && key ? (mode === "enc" ? xorEnc(text, key) : xorDec(text, key)) : "";
  const run = () => addHistory("XOR " + (mode === "enc" ? "Encrypt" : "Decrypt"), text.slice(0, 40), out);

  return (
    <div>
      <div className="section-header">
        <h3>XOR Cipher</h3>
        <p>Bitwise XOR with repeating key. Encrypt outputs hex; decrypt expects hex input.</p>
      </div>

      <div className="tabs-wrap">
        {["enc", "dec"].map(m => (
          <button key={m} className={`tab${mode === m ? " active" : ""}`} onClick={() => setMode(m)}>
            {m === "enc" ? "Encrypt (→ hex)" : "Decrypt (hex →)"}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 10 }}>
          <label>{mode === "enc" ? "Plaintext" : "Hex ciphertext"}</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={mode === "enc" ? "Enter text…" : "Enter hex string…"}
            rows={3}
          />
        </div>
        <div className="row">
          <div>
            <label>Key</label>
            <input value={key} onChange={e => setKey(e.target.value)} placeholder="Any string" />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={run}>Run ↗</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">{mode === "enc" ? "Hex ciphertext" : "Decrypted text"}</div>
        <Output value={out} mono={mode === "enc"} />
      </div>
    </div>
  );
}
