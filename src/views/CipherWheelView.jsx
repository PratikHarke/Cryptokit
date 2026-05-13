import { useState, useRef, useCallback, useEffect } from "react";
import { caesarEnc, caesarDec } from "../crypto/caesar.js";
import { CopyBtn } from "../components/Output.jsx";

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const N = 26;
const CX = 200, CY = 200;
const R_OUTER = 170, R_INNER = 120, R_CENTER = 80;

// Convert polar to cartesian
function polar(cx, cy, r, angle) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

// SVG arc path for a ring sector
function sectorPath(cx, cy, r1, r2, startAngle, endAngle) {
  const p1 = polar(cx, cy, r2, startAngle);
  const p2 = polar(cx, cy, r2, endAngle);
  const p3 = polar(cx, cy, r1, endAngle);
  const p4 = polar(cx, cy, r1, startAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${r2} ${r2} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${r1} ${r1} 0 ${large} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

// ─── Cipher Wheel SVG ─────────────────────────────────────────────────────────

function CipherWheel({ shift, onShiftChange }) {
  const svgRef = useRef(null);
  const dragging = useRef(false);
  const startAngle = useRef(0);
  const startShift = useRef(0);

  const sliceAngle = (2 * Math.PI) / N;
  // -π/2 puts A at top
  const OFFSET = -Math.PI / 2;

  function angleFromEvent(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 400 / rect.width;
    const scaleY = 400 / rect.height;
    const mx = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const my = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    return Math.atan2(my * scaleY - CY, mx * scaleX - CX);
  }

  const onPointerDown = (e) => {
    dragging.current = true;
    startAngle.current = angleFromEvent(e);
    startShift.current = shift;
    e.preventDefault();
  };

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return;
    const currentAngle = angleFromEvent(e);
    let delta = currentAngle - startAngle.current;
    // Normalize to [-π, π]
    while (delta > Math.PI)  delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    const slicesDelta = Math.round(delta / sliceAngle);
    const newShift = ((startShift.current + slicesDelta) % 26 + 26) % 26;
    onShiftChange(newShift);
  }, [onShiftChange, sliceAngle]);

  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp);
    return () => {
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 400 400"
      style={{ width: "100%", maxWidth: 380, display: "block", margin: "0 auto", cursor: "grab", userSelect: "none" }}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
    >
      {/* Outer ring (cipher text - fixed) */}
      {ALPHA.split("").map((ch, i) => {
        const startA = OFFSET + i * sliceAngle;
        const endA   = startA + sliceAngle - 0.02;
        const midA   = startA + sliceAngle / 2;
        const textPos = polar(CX, CY, (R_OUTER + R_INNER) / 2 + 10, midA);
        const isHighlight = i === 0;
        return (
          <g key={`outer-${i}`}>
            <path
              d={sectorPath(CX, CY, R_INNER, R_OUTER, startA, endA)}
              fill={isHighlight ? "#1d4ed8" : i % 2 === 0 ? "#0f172a" : "#070b16"}
              stroke="#1e293b"
              strokeWidth={1}
            />
            <text
              x={textPos.x} y={textPos.y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={14} fontWeight={isHighlight ? 700 : 500}
              fill={isHighlight ? "#fff" : "#94a3b8"}
              style={{ pointerEvents: "none" }}
            >
              {ch}
            </text>
          </g>
        );
      })}

      {/* Inner ring (plain text - rotates with shift) */}
      {ALPHA.split("").map((ch, i) => {
        const plainIdx = (i - shift + 26) % 26;
        const plainCh = ALPHA[plainIdx];
        const startA = OFFSET + i * sliceAngle;
        const endA   = startA + sliceAngle - 0.02;
        const midA   = startA + sliceAngle / 2;
        const textPos = polar(CX, CY, (R_INNER + R_CENTER) / 2 + 4, midA);
        const isMapped = i === 0;
        return (
          <g key={`inner-${i}`}>
            <path
              d={sectorPath(CX, CY, R_CENTER, R_INNER - 2, startA, endA)}
              fill={isMapped ? "#14532d" : i % 2 === 0 ? "#1e293b" : "#0f172a"}
              stroke="#334155"
              strokeWidth={1}
            />
            <text
              x={textPos.x} y={textPos.y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={12} fontWeight={isMapped ? 700 : 400}
              fill={isMapped ? "#86efac" : "#64748b"}
              style={{ pointerEvents: "none" }}
            >
              {plainCh}
            </text>
          </g>
        );
      })}

      {/* Center hub */}
      <circle cx={CX} cy={CY} r={R_CENTER} fill="#070b16" stroke="#1e293b" strokeWidth={2} />
      <text x={CX} y={CY - 12} textAnchor="middle" fontSize={11} fill="#475569">SHIFT</text>
      <text x={CX} y={CY + 8}  textAnchor="middle" fontSize={28} fontWeight={700} fill="#60a5fa">{shift}</text>
      <text x={CX} y={CY + 26} textAnchor="middle" fontSize={10} fill="#334155">drag to rotate</text>

      {/* Indicator arrow at top */}
      <polygon points={`${CX},${CY - R_OUTER - 4} ${CX - 7},${CY - R_OUTER + 10} ${CX + 7},${CY - R_OUTER + 10}`}
        fill="#3b82f6" />

      {/* Outer ring label */}
      <text x={CX} y={18} textAnchor="middle" fontSize={9} fill="#475569" fontWeight={600} letterSpacing={1}>
        CIPHER (outer) ← drag
      </text>
      <text x={CX} y={392} textAnchor="middle" fontSize={9} fill="#334155" fontWeight={600} letterSpacing={1}>
        PLAIN (inner)
      </text>
    </svg>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function CipherWheelView({ addHistory }) {
  const [shift, setShift] = useState(3);
  const [text, setText] = useState("");
  const [mode, setMode] = useState("enc");

  const out = text ? (mode === "enc" ? caesarEnc(text, shift) : caesarDec(text, shift)) : "";
  const run = () => addHistory(`Caesar Wheel (shift=${shift})`, text.slice(0, 30), out);

  // Mapping table for current shift
  const mappingRows = ALPHA.split("").map(ch => ({
    cipher: ch,
    plain:  ALPHA[(ALPHA.indexOf(ch) - shift + 26) % 26],
  }));

  return (
    <div>
      <div className="section-header">
        <h3>Cipher Wheel</h3>
        <p>
          Drag the wheel to set the shift. Outer ring = cipher alphabet. Inner ring = plain alphabet.
          The arrow marks the active mapping.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Wheel column */}
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <CipherWheel shift={shift} onShiftChange={setShift} />
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center", alignItems: "center" }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShift(s => (s - 1 + 26) % 26)}
              >← -1</button>
              <input
                type="number" min={0} max={25} value={shift}
                onChange={e => setShift(((Number(e.target.value) % 26) + 26) % 26)}
                style={{ width: 60, textAlign: "center", fontWeight: 700, fontSize: 16 }}
              />
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShift(s => (s + 1) % 26)}
              >+1 →</button>
            </div>
            {/* Quick preset buttons */}
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {[3, 13, 7, 17, 25].map(s => (
                <button
                  key={s}
                  className={`btn btn-sm ${shift === s ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setShift(s)}
                >
                  {s === 13 ? "ROT13" : `Shift ${s}`}
                </button>
              ))}
            </div>
          </div>

          {/* Mapping table */}
          <div className="card">
            <div className="card-title">Full Substitution Alphabet</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(13, 1fr)", gap: 2 }}>
              <div style={{ fontSize: 10, color: "#475569", textAlign: "center", gridColumn: "span 13", marginBottom: 2 }}>
                Cipher → Plain
              </div>
              {mappingRows.slice(0, 13).map(({ cipher, plain }) => (
                <div key={cipher} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#93c5fd", fontFamily: "monospace", fontWeight: 600 }}>{cipher}</div>
                  <div style={{ fontSize: 9, color: "#334155" }}>↓</div>
                  <div style={{ fontSize: 12, color: "#86efac", fontFamily: "monospace", fontWeight: 600 }}>{plain}</div>
                </div>
              ))}
              <div style={{ gridColumn: "span 13", borderTop: "1px solid #1e293b", margin: "4px 0" }} />
              {mappingRows.slice(13).map(({ cipher, plain }) => (
                <div key={cipher} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#93c5fd", fontFamily: "monospace", fontWeight: 600 }}>{cipher}</div>
                  <div style={{ fontSize: 9, color: "#334155" }}>↓</div>
                  <div style={{ fontSize: 12, color: "#86efac", fontFamily: "monospace", fontWeight: 600 }}>{plain}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Encrypt/Decrypt column */}
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="tabs-wrap" style={{ marginBottom: 12 }}>
              {["enc", "dec"].map(m => (
                <button
                  key={m}
                  className={`tab${mode === m ? " active" : ""}`}
                  onClick={() => setMode(m)}
                >
                  {m === "enc" ? "Encrypt" : "Decrypt"}
                </button>
              ))}
            </div>
            <label>Input text</label>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter text…" rows={5} />
            <button className="btn btn-primary" style={{ marginTop: 10, width: "100%" }} onClick={run}>
              Log to History ↗
            </button>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div className="card-title" style={{ margin: 0 }}>Output (shift {shift})</div>
              {out && <CopyBtn text={out} />}
            </div>
            <div style={{
              background: "#070b16", border: "1px solid #1e293b", borderRadius: 6,
              padding: "10px 12px", fontFamily: "monospace", fontSize: 13,
              color: "#86efac", wordBreak: "break-all", whiteSpace: "pre-wrap",
              lineHeight: 1.6, minHeight: 60,
            }}>
              {out || <span style={{ color: "#334155" }}>Output will appear here…</span>}
            </div>

            <div className="info-box" style={{ marginTop: 12 }}>
              <b style={{ color: "#93c5fd" }}>Decrypt shift:</b>{" "}
              <span className="highlight">{26 - shift}</span> (= 26 − {shift}).
              ROT-13 is self-inverse (shift 13 applied twice = no change).{" "}
              {shift === 13 && <span style={{ color: "#86efac" }}>← You're using ROT-13 right now!</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
