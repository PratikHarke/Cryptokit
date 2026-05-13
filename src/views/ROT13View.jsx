import { useState } from "react";
import Output from "../components/Output.jsx";
import { rot13 } from "../crypto/caesar.js";

export default function ROT13View({ addHistory }) {
  const [text, setText] = useState("");
  const out = text ? rot13(text) : "";

  return (
    <div>
      <div className="section-header">
        <h3>ROT-13</h3>
        <p>Caesar cipher with shift 13. Self-inverse: applying twice restores original text.</p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label>Input text</label>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter text…" rows={4} />
        <button
          className="btn btn-primary"
          style={{ marginTop: 10, width: "100%" }}
          onClick={() => addHistory("ROT-13", text.slice(0, 40), out)}
        >
          Transform ↗
        </button>
      </div>

      <div className="card">
        <div className="card-title">Output (applying again reverses it)</div>
        <Output value={out} />
      </div>
    </div>
  );
}
