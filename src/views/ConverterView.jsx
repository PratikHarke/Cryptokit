import { useState } from "react";
import { convertAll, FORMAT_LABELS, detectFormat } from "../crypto/converters.js";
import { CopyBtn } from "../components/Output.jsx";

const FORMAT_COLORS = {
  ascii:   "#86efac",
  hex:     "#93c5fd",
  binary:  "#fbbf24",
  decimal: "#f9a8d4",
  base64:  "#a78bfa",
  url:     "#6ee7b7",
};

function FormatBox({ label, value, color }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color, letterSpacing: ".5px", textTransform: "uppercase" }}>
          {label}
        </span>
        {value && <CopyBtn text={value} />}
      </div>
      <div style={{
        background: "#070b16", border: `1px solid ${color}33`, borderRadius: 6,
        padding: "8px 10px", fontFamily: "monospace", fontSize: 12.5,
        color, wordBreak: "break-all", whiteSpace: "pre-wrap", lineHeight: 1.5,
        maxHeight: 120, overflowY: "auto",
      }}>
        {value}
      </div>
    </div>
  );
}

export default function ConverterView({ addHistory }) {
  const [input, setInput] = useState("");
  const [results, setResults] = useState(null);

  const detected = input ? detectFormat(input) : null;

  const run = () => {
    const r = convertAll(input);
    setResults(r);
    addHistory("Base Converter", input.slice(0, 30), `Detected: ${FORMAT_LABELS[r.detected]}`);
  };

  return (
    <div>
      <div className="section-header">
        <h3>Base Converter</h3>
        <p>
          Auto-detects hex, binary, Base64, URL-encoded, or decimal bytes and converts to all
          formats in one click.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <label style={{ margin: 0 }}>Input — paste anything</label>
          {detected && (
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 4,
              background: (FORMAT_COLORS[detected] || "#475569") + "22",
              color: FORMAT_COLORS[detected] || "#94a3b8",
              fontWeight: 600,
            }}>
              Detected: {FORMAT_LABELS[detected]}
            </span>
          )}
        </div>
        <textarea
          value={input}
          onChange={e => { setInput(e.target.value); setResults(null); }}
          placeholder="48656c6c6f  /  SGVsbG8=  /  01001000...  /  Hello world"
          rows={4}
          style={{ fontFamily: "monospace" }}
        />
        <button className="btn btn-primary" style={{ marginTop: 10, width: "100%" }} onClick={run}>
          Convert All ↗
        </button>
      </div>

      {results && !results.ascii && (
        <div className="card">
          <div style={{ color: "#ef4444", fontSize: 13 }}>
            Could not decode input as {FORMAT_LABELS[results.detected]}. Check for typos or try pasting raw ASCII.
          </div>
        </div>
      )}

      {results && results.ascii && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>
            All Representations
          </div>
          <FormatBox label="ASCII / Text"    value={results.ascii}   color={FORMAT_COLORS.ascii} />
          <FormatBox label="Hex"             value={results.hex}     color={FORMAT_COLORS.hex} />
          <FormatBox label="Binary"          value={results.binary}  color={FORMAT_COLORS.binary} />
          <FormatBox label="Decimal bytes"   value={results.decimal} color={FORMAT_COLORS.decimal} />
          <FormatBox label="Base64"          value={results.base64}  color={FORMAT_COLORS.base64} />
          <FormatBox label="URL encoded"     value={results.url}     color={FORMAT_COLORS.url} />

          <div className="info-box" style={{ marginTop: 4 }}>
            Input detected as <span className="highlight">{FORMAT_LABELS[results.detected]}</span>.
            ASCII length: <span className="highlight">{results.ascii.length}</span> chars.
            All representations encode the same underlying bytes.
          </div>
        </div>
      )}
    </div>
  );
}
