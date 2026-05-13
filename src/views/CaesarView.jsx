import { useState } from "react";
import Output from "../components/Output.jsx";
import { caesarEnc, caesarDec } from "../crypto/caesar.js";

export default function CaesarView({ addHistory }) {
  const [text, setText] = useState("");
  const [shift, setShift] = useState(3);
  const [mode, setMode] = useState("enc");

  const out = text ? (mode === "enc" ? caesarEnc(text, shift) : caesarDec(text, shift)) : "";
  const run = () => addHistory("Caesar " + (mode === "enc" ? "Encrypt" : "Decrypt"), text.slice(0, 40), out);

  return (
    <div>
      <div className="section-header">
        <h3>Caesar Cipher</h3>
        <p>Shifts each letter by a fixed number of positions in the alphabet.</p>
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
            <label>Shift (0–25)</label>
            <input type="number" min={0} max={25} value={shift} onChange={e => setShift(Number(e.target.value))} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={run}>Run ↗</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Output</div>
        <Output value={out} />
        <div className="info-box" style={{ marginTop: 12 }}>
          <b style={{ color: "#93c5fd" }}>Properties:</b> Each letter shifted by{" "}
          <span className="highlight">{((shift % 26) + 26) % 26}</span> positions.
          ROT-13 is Caesar with shift=13. Decrypt by using shift{" "}
          <span className="highlight">{26 - (((shift % 26) + 26) % 26)}</span>.
        </div>
      </div>
    </div>
  );
}
