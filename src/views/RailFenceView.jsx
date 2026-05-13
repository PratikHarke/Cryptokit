import { useState } from "react";
import { railFenceEnc, railFenceDec, railFenceGrid, columnarEnc, columnarDec, columnarGrid } from "../crypto/transposition.js";
import Output from "../components/Output.jsx";

const RAIL_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
  "#a78bfa", "#6ee7b7", "#fbbf24", "#f9a8d4",
];

// ─── Rail Fence Visual ────────────────────────────────────────────────────────

function RailFenceVisual({ text, rails }) {
  if (!text || rails < 2 || rails >= text.length) return null;
  const grid = railFenceGrid(text, rails);

  return (
    <div style={{ overflowX: "auto", marginTop: 12 }}>
      <div className="card-title">Rail Grid Visualization</div>
      <div style={{ display: "grid", gridTemplateRows: `repeat(${rails}, 28px)`, position: "relative", paddingBottom: 4 }}>
        {Array.from({ length: rails }, (_, r) => (
          <div key={r} style={{ display: "flex", alignItems: "center", position: "relative", height: 28 }}>
            <span style={{ width: 24, fontSize: 10, color: RAIL_COLORS[r % 8], fontWeight: 700, flexShrink: 0 }}>
              R{r}
            </span>
            <div style={{ display: "flex", position: "relative" }}>
              {grid.map(({ char, rail, position }) => (
                <div key={position} style={{
                  width: 22, textAlign: "center", fontFamily: "monospace", fontSize: 12,
                  color: rail === r ? RAIL_COLORS[r % 8] : "transparent",
                  fontWeight: rail === r ? 700 : 400,
                  background: rail === r ? RAIL_COLORS[r % 8] + "18" : "transparent",
                  borderRadius: 3, margin: "0 1px",
                  transition: ".1s",
                }}>
                  {rail === r ? char : "·"}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
        Read each row left-to-right to get the ciphertext.
      </div>
    </div>
  );
}

// ─── Rail Fence Tab ───────────────────────────────────────────────────────────

function RailTab({ addHistory }) {
  const [text, setText] = useState("");
  const [rails, setRails] = useState(3);
  const [mode, setMode] = useState("enc");
  const [showViz, setShowViz] = useState(true);

  const out = text ? (mode === "enc" ? railFenceEnc(text, rails) : railFenceDec(text, rails)) : "";
  const run = () => addHistory(`Rail Fence ${mode === "enc" ? "Encrypt" : "Decrypt"} (${rails} rails)`, text.slice(0, 30), out);

  return (
    <div>
      <div className="tabs-wrap">
        {["enc", "dec"].map(m => (
          <button key={m} className={`tab${mode === m ? " active" : ""}`} onClick={() => setMode(m)}>
            {m === "enc" ? "Encrypt" : "Decrypt"}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 10 }}>
          <label>Text</label>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter text…" rows={3} />
        </div>
        <div className="row">
          <div>
            <label>Number of rails (2–8)</label>
            <input
              type="number" min={2} max={8} value={rails}
              onChange={e => setRails(Math.max(2, Math.min(8, Number(e.target.value))))}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={run}>Run ↗</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="card-title" style={{ margin: 0 }}>Output</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowViz(v => !v)}>
            {showViz ? "Hide" : "Show"} grid
          </button>
        </div>
        <div style={{ marginTop: 10 }}><Output value={out} /></div>
        {showViz && mode === "enc" && text && (
          <RailFenceVisual text={text} rails={rails} />
        )}
      </div>

      {/* Bruteforce decrypt */}
      {mode === "dec" && text && (
        <div className="card">
          <div className="card-title">Bruteforce — All Rail Counts</div>
          {Array.from({ length: Math.min(7, text.length - 1) }, (_, i) => i + 2).map(r => (
            <div key={r} style={{ padding: "5px 0", borderBottom: "1px solid #0f172a", display: "flex", gap: 12, fontSize: 12 }}>
              <span style={{ color: RAIL_COLORS[(r - 2) % 8], fontWeight: 700, width: 50, flexShrink: 0 }}>
                {r} rails
              </span>
              <span style={{ fontFamily: "monospace", color: "#e2e8f0", wordBreak: "break-all" }}>
                {railFenceDec(text, r).slice(0, 80)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Columnar Tab ─────────────────────────────────────────────────────────────

function ColumnarTab({ addHistory }) {
  const [text, setText] = useState("");
  const [key, setKey] = useState("CRYPTO");
  const [mode, setMode] = useState("enc");

  const out = text && key ? (mode === "enc" ? columnarEnc(text, key) : columnarDec(text, key)) : "";
  const gridData = text && key && mode === "enc" ? columnarGrid(text, key) : null;

  const run = () => addHistory(`Columnar ${mode === "enc" ? "Encrypt" : "Decrypt"} (key="${key}")`, text.slice(0, 30), out);

  return (
    <div>
      <div className="tabs-wrap">
        {["enc", "dec"].map(m => (
          <button key={m} className={`tab${mode === m ? " active" : ""}`} onClick={() => setMode(m)}>
            {m === "enc" ? "Encrypt" : "Decrypt"}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 10 }}>
          <label>Text</label>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter text…" rows={3} />
        </div>
        <div className="row">
          <div>
            <label>Key (any word)</label>
            <input value={key} onChange={e => setKey(e.target.value.toUpperCase())} placeholder="e.g. CRYPTO" style={{ fontFamily: "monospace", letterSpacing: 2 }} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={run}>Run ↗</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title">Output</div>
        <Output value={out} />
      </div>

      {/* Grid visualization */}
      {gridData && (
        <div className="card">
          <div className="card-title">Column Grid (columns read in alphabetical key order)</div>
          <div style={{ overflowX: "auto" }}>
            {/* Key header */}
            <div style={{ display: "flex", marginBottom: 4, gap: 2 }}>
              {gridData.key.map((ch, i) => {
                const sortIdx = gridData.order.indexOf(i);
                return (
                  <div key={i} style={{
                    width: 28, textAlign: "center", padding: "3px 0", borderRadius: 4,
                    background: RAIL_COLORS[sortIdx % 8] + "33",
                    fontSize: 12, fontWeight: 700,
                    color: RAIL_COLORS[sortIdx % 8],
                  }}>
                    {ch}
                    <div style={{ fontSize: 9, color: "#475569" }}>#{sortIdx + 1}</div>
                  </div>
                );
              })}
            </div>
            {/* Grid rows */}
            {gridData.grid.map((row, ri) => (
              <div key={ri} style={{ display: "flex", gap: 2, marginBottom: 2 }}>
                {row.map((char, ci) => {
                  const sortIdx = gridData.order.indexOf(ci);
                  return (
                    <div key={ci} style={{
                      width: 28, height: 24, textAlign: "center", lineHeight: "24px",
                      fontFamily: "monospace", fontSize: 12, borderRadius: 3,
                      background: "#1e293b",
                      color: char === "X" ? "#334155" : RAIL_COLORS[sortIdx % 8],
                      fontWeight: 600,
                    }}>
                      {char}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>
            Numbers show the read order (1 = first column taken). X = padding.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function RailFenceView({ addHistory }) {
  const [tab, setTab] = useState("rail");
  return (
    <div>
      <div className="section-header">
        <h3>Transposition Ciphers</h3>
        <p>Rail Fence (zigzag) and Columnar Transposition — both with grid visualizations.</p>
      </div>
      <div className="tabs-wrap">
        {[["rail", "Rail Fence"], ["columnar", "Columnar"]].map(([id, label]) => (
          <button key={id} className={`tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "rail" ? <RailTab addHistory={addHistory} /> : <ColumnarTab addHistory={addHistory} />}
    </div>
  );
}
