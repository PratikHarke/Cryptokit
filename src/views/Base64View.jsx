import { useState } from "react";
import Output from "../components/Output.jsx";
import { b64Enc, b64Dec } from "../crypto/base64.js";

export default function Base64View({ addHistory }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("enc");

  const out = text ? (mode === "enc" ? b64Enc(text) : b64Dec(text)) : "";

  return (
    <div>
      <div className="section-header">
        <h3>Base64 Encoding</h3>
        <p>Encodes binary data as ASCII characters. Widely used in HTTP, email, JWTs.</p>
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
          placeholder={mode === "enc" ? "Plain text…" : "Base64 string…"}
          rows={4}
        />
        <button
          className="btn btn-primary"
          style={{ marginTop: 10, width: "100%" }}
          onClick={() => addHistory("Base64 " + (mode === "enc" ? "Encode" : "Decode"), text.slice(0, 40), out)}
        >
          Run ↗
        </button>
      </div>

      <div className="card">
        <div className="card-title">Output</div>
        <Output value={out} mono={mode === "enc"} />
      </div>
    </div>
  );
}
