import { useState } from "react";
import { CopyBtn } from "../components/Output.jsx";
import { morseEnc, morseDec } from "../crypto/morse.js";

export default function MorseView({ addHistory }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("enc");

  const out = text ? (mode === "enc" ? morseEnc(text) : morseDec(text)) : "";

  return (
    <div>
      <div className="section-header">
        <h3>Morse Code</h3>
        <p>Encode/decode text. Words separated by /, letters by space.</p>
      </div>

      <div className="tabs-wrap">
        {["enc", "dec"].map(m => (
          <button key={m} className={`tab${mode === m ? " active" : ""}`} onClick={() => setMode(m)}>
            {m === "enc" ? "Encode" : "Decode"}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label>Input</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={mode === "enc" ? "Enter text…" : ".- .-.. .--. ..."}
          rows={3}
        />
        <button
          className="btn btn-primary"
          style={{ marginTop: 10, width: "100%" }}
          onClick={() => addHistory("Morse " + (mode === "enc" ? "Encode" : "Decode"), text.slice(0, 40), out)}
        >
          Run ↗
        </button>
      </div>

      <div className="card">
        <div className="card-title">Output</div>
        <div className="morse-out">
          {out || <span style={{ color: "#334155" }}>Output will appear here…</span>}
        </div>
        {out && <CopyBtn text={out} />}
      </div>
    </div>
  );
}
