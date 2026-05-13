import { useState, useMemo } from "react";
import {
  shannonEntropy, slidingWindowEntropy, byteFrequency,
  classifyEntropy, parseToBytes,
} from "../crypto/entropy.js";
import { CopyBtn } from "../components/Output.jsx";

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function entropyColor(h) {
  // 0 → blue, 4 → yellow, 8 → red
  if (h < 1)   return "#1d4ed8";
  if (h < 2.5) return "#2563eb";
  if (h < 4)   return "#22c55e";
  if (h < 5.5) return "#f59e0b";
  if (h < 6.5) return "#f97316";
  if (h < 7.2) return "#ef4444";
  return              "#dc2626";
}

function ByteHeatmap({ bytes, windowSize }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const COLS = 64;
  const rows = Math.ceil(bytes.length / COLS);

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 10px)`, gap: 1 }}>
          {bytes.map((b, i) => {
            const windowBytes = bytes.slice(
              Math.max(0, i - Math.floor(windowSize / 2)),
              i + Math.ceil(windowSize / 2)
            );
            const H = shannonEntropy(windowBytes);
            const color = entropyColor(H);
            const cls = classifyEntropy(H);
            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                title={`Byte ${i}: 0x${b.toString(16).padStart(2, "0")} (${b >= 32 && b < 127 ? String.fromCharCode(b) : "·"}) | H=${H.toFixed(2)} | ${cls.label}`}
                style={{
                  width: 10, height: 10, borderRadius: 1,
                  background: color,
                  opacity: hoveredIdx !== null && Math.abs(hoveredIdx - i) > windowSize / 2 ? 0.5 : 1,
                  cursor: "crosshair",
                  transition: "opacity .1s",
                }}
              />
            );
          })}
        </div>
      </div>

      {hoveredIdx !== null && (
        <div style={{
          marginTop: 10, padding: "8px 12px", background: "#070b16",
          border: "1px solid #1e293b", borderRadius: 6, fontSize: 12,
          display: "flex", gap: 20, flexWrap: "wrap",
        }}>
          {(() => {
            const b = bytes[hoveredIdx];
            const windowBytes = bytes.slice(
              Math.max(0, hoveredIdx - Math.floor(windowSize / 2)),
              hoveredIdx + Math.ceil(windowSize / 2)
            );
            const H = shannonEntropy(windowBytes);
            const cls = classifyEntropy(H);
            return (
              <>
                <span><span style={{ color: "var(--text-3)" }}>Byte:</span> <b style={{ color: "#e2e8f0" }}>{hoveredIdx}</b></span>
                <span><span style={{ color: "var(--text-3)" }}>Hex:</span> <b style={{ color: "#93c5fd", fontFamily: "monospace" }}>0x{b.toString(16).padStart(2, "0")}</b></span>
                <span><span style={{ color: "var(--text-3)" }}>ASCII:</span> <b style={{ color: "var(--green)", fontFamily: "monospace" }}>{b >= 32 && b < 127 ? String.fromCharCode(b) : "·"}</b></span>
                <span><span style={{ color: "var(--text-3)" }}>Entropy:</span> <b style={{ color: cls.color }}>{H.toFixed(3)} bits</b></span>
                <span><span style={{ color: "var(--text-3)" }}>Region:</span> <b style={{ color: cls.color }}>{cls.label}</b></span>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Entropy Chart ────────────────────────────────────────────────────────────

function EntropyChart({ windows, totalBytes }) {
  const W = 600, H_CHART = 120;
  const maxOffset = windows[windows.length - 1]?.offset || 1;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H_CHART + 20}`} style={{ width: "100%", maxWidth: W, display: "block" }}>
        {/* Grid lines */}
        {[0, 2, 4, 6, 8].map(h => (
          <g key={h}>
            <line
              x1={0} y1={H_CHART - (h / 8) * H_CHART}
              x2={W} y2={H_CHART - (h / 8) * H_CHART}
              stroke="var(--bg-hover)" strokeWidth={1}
            />
            <text x={2} y={H_CHART - (h / 8) * H_CHART - 2} fontSize={8} fill="#334155">{h}</text>
          </g>
        ))}

        {/* Entropy bars */}
        {windows.map((w, i) => {
          const x = (w.offset / totalBytes) * W;
          const nextX = i < windows.length - 1 ? (windows[i + 1].offset / totalBytes) * W : W;
          const barW = Math.max(1, nextX - x);
          const barH = (w.entropy / 8) * H_CHART;
          return (
            <rect
              key={i}
              x={x} y={H_CHART - barH}
              width={barW} height={barH}
              fill={entropyColor(w.entropy)}
              opacity={0.85}
            />
          );
        })}

        {/* Threshold lines */}
        {[
          { h: 7.0, label: "Likely encrypted", color: "#ef4444" },
          { h: 5.5, label: "Compressed",       color: "#f97316" },
          { h: 3.5, label: "Natural text",      color: "#22c55e" },
        ].map(({ h, label, color }) => (
          <g key={label}>
            <line
              x1={0} y1={H_CHART - (h / 8) * H_CHART}
              x2={W} y2={H_CHART - (h / 8) * H_CHART}
              stroke={color} strokeWidth={1} strokeDasharray="4 3" opacity={0.6}
            />
            <text x={W - 2} y={H_CHART - (h / 8) * H_CHART - 2} fontSize={8} fill={color} textAnchor="end">
              {label}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <text key={t} x={t * W} y={H_CHART + 14} fontSize={9} fill="var(--text-3)" textAnchor="middle">
            {Math.round(t * totalBytes)}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─── Byte Frequency Grid ──────────────────────────────────────────────────────

function ByteFreqGrid({ freq }) {
  const max = Math.max(...freq);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)", gap: 2 }}>
        {freq.map((count, b) => {
          const pct = max > 0 ? count / max : 0;
          const color = b >= 32 && b < 127 ? "var(--accent)" : b === 0 ? "#ef4444" : "var(--text-3)";
          return (
            <div
              key={b}
              title={`0x${b.toString(16).padStart(2, "0")} = ${count} (${b >= 32 && b < 127 ? String.fromCharCode(b) : b === 0 ? "NULL" : "non-print"})`}
              style={{
                height: 24, borderRadius: 2,
                background: pct > 0 ? color : "#0f172a",
                opacity: 0.2 + pct * 0.8,
                cursor: "pointer",
              }}
            />
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 6, display: "flex", gap: 12 }}>
        <span><span style={{ color: "var(--accent)" }}>█</span> Printable ASCII</span>
        <span><span style={{ color: "#ef4444" }}>█</span> Null bytes</span>
        <span><span style={{ color: "var(--text-3)" }}>█</span> Non-printable</span>
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function EntropyView({ addHistory }) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("text");
  const [windowSize, setWindowSize] = useState(32);
  const [analyzed, setAnalyzed] = useState(false);

  const bytes = useMemo(() => {
    if (!input || !analyzed) return null;
    return parseToBytes(input, mode);
  }, [input, mode, analyzed]);

  const globalEntropy = useMemo(() => bytes ? shannonEntropy(bytes) : null, [bytes]);
  const windows       = useMemo(() => bytes ? slidingWindowEntropy(bytes, windowSize) : [], [bytes, windowSize]);
  const freq          = useMemo(() => bytes ? byteFrequency(bytes) : null, [bytes]);
  const cls           = globalEntropy !== null ? classifyEntropy(globalEntropy) : null;

  const run = () => {
    setAnalyzed(true);
    const b = parseToBytes(input, mode);
    if (b) addHistory("Entropy Analysis", input.slice(0, 30), `H=${shannonEntropy(b).toFixed(3)} bits, ${b.length} bytes`);
  };

  const uniqueBytes = bytes ? new Set(bytes).size : 0;

  return (
    <div>
      <div className="section-header">
        <h3>Entropy Visualizer</h3>
        <p>
          Byte-level Shannon entropy heatmap. High entropy (red) = likely encrypted or compressed.
          Low entropy (blue/green) = structured text or data.
        </p>
      </div>

      {/* Input */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label>Input mode</label>
            <select value={mode} onChange={e => { setMode(e.target.value); setAnalyzed(false); }} style={{ height: 34 }}>
              <option value="text">Plain text (UTF-8)</option>
              <option value="hex">Hex string</option>
              <option value="b64">Base64</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Window size (bytes)</label>
            <select value={windowSize} onChange={e => setWindowSize(Number(e.target.value))} style={{ height: 34 }}>
              {[8, 16, 32, 64, 128].map(w => <option key={w} value={w}>{w} bytes</option>)}
            </select>
          </div>
        </div>
        <label>
          {mode === "text" ? "Text input" : mode === "hex" ? "Hex ciphertext" : "Base64 input"}
        </label>
        <textarea
          value={input}
          onChange={e => { setInput(e.target.value); setAnalyzed(false); }}
          placeholder={
            mode === "text" ? "Paste plaintext, ciphertext, or any text…"
            : mode === "hex" ? "Paste hex string…"
            : "Paste Base64 string…"
          }
          rows={4}
          style={{ fontFamily: mode !== "text" ? "monospace" : "inherit" }}
        />
        <button className="btn btn-primary" style={{ marginTop: 10, width: "100%" }} onClick={run}>
          Analyze Entropy ↗
        </button>
      </div>

      {bytes === null && analyzed && (
        <div className="card">
          <div style={{ color: "#ef4444", fontSize: 13 }}>
            Failed to parse input as {mode}. Check your input format.
          </div>
        </div>
      )}

      {bytes && (
        <>
          {/* Global stats */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
              {[
                ["Global entropy",  `${globalEntropy.toFixed(4)} bits/byte`, cls.color],
                ["Classification",  cls.label,                               cls.color],
                ["Total bytes",     bytes.length,                            "#e2e8f0"],
                ["Unique bytes",    `${uniqueBytes} / 256`,                  "#e2e8f0"],
              ].map(([k, v, color]) => (
                <div key={k} style={{ background: "#070b16", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "monospace" }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Entropy legend */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                [0,   2,   "#1d4ed8", "Uniform/constant"],
                [2,   4,   "#22c55e", "Structured text"],
                [4,   5.5, "#f59e0b", "Compressed/encoded"],
                [5.5, 7,   "#f97316", "Likely encrypted"],
                [7,   8,   "#ef4444", "Max entropy (random)"],
              ].map(([lo, hi, color, label]) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 11, color: "#94a3b8",
                }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: color }} />
                  {label} ({lo}–{hi})
                </div>
              ))}
            </div>
          </div>

          {/* Entropy chart over bytes */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-title">Entropy Over Byte Offset (window={windowSize})</div>
            <EntropyChart windows={windows} totalBytes={bytes.length} />
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
              X-axis: byte offset. Y-axis: Shannon entropy (0–8 bits/byte).
              Dashed lines = classification thresholds.
            </div>
          </div>

          {/* Byte heatmap */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-title">Byte Heatmap — Hover for details ({bytes.length} bytes, {Math.ceil(bytes.length / 64)} rows × 64 cols)</div>
            <ByteHeatmap bytes={bytes} windowSize={windowSize} />
          </div>

          {/* Byte frequency */}
          <div className="card">
            <div className="card-title">Byte Frequency Grid (0x00–0xFF)</div>
            <ByteFreqGrid freq={freq} />
            <div className="info-box" style={{ marginTop: 10 }}>
              <b style={{ color: "#93c5fd" }}>How to read this:</b> A flat frequency distribution (all bytes roughly equal)
              is a strong indicator of encryption. Peaks at printable ASCII (0x20–0x7E) suggest plaintext or encoding.
              A single dominant byte (e.g., only 'a') gives near-zero entropy.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
