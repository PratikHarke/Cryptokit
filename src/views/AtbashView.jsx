import { useState } from "react";
import Output from "../components/Output.jsx";
import { atbash } from "../crypto/atbash.js";

export default function AtbashView({ addHistory }) {
  const [text, setText] = useState("");
  const out = text ? atbash(text) : "";

  return (
    <div>
      <div className="section-header">
        <h3>Atbash Cipher</h3>
        <p>Substitutes A↔Z, B↔Y, etc. Self-inverse like ROT-13. Originally used for Hebrew.</p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label>Input text</label>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter text…" rows={4} />
        <button
          className="btn btn-primary"
          style={{ marginTop: 10, width: "100%" }}
          onClick={() => addHistory("Atbash", text.slice(0, 40), out)}
        >
          Transform ↗
        </button>
      </div>

      <div className="card">
        <div className="card-title">Output</div>
        <Output value={out} />
      </div>
    </div>
  );
}
