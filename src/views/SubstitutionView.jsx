import { useState, useMemo } from "react";
import { freqAnalysis } from "../crypto/analysis.js";
import { EN_FREQ } from "../constants.js";
import { CopyBtn } from "../components/Output.jsx";

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Apply a mapping to ciphertext
function applyMapping(text, mapping) {
  return text.split("").map(c => {
    if (/[A-Z]/.test(c)) return mapping[c] || "·";
    if (/[a-z]/.test(c)) {
      const mapped = mapping[c.toUpperCase()];
      return mapped ? mapped.toLowerCase() : "·";
    }
    return c;
  }).join("");
}

// Frequency-based auto-guess (most frequent cipher char → most common English letter)
const EN_ORDER = Object.entries(EN_FREQ).sort((a, b) => b[1] - a[1]).map(([c]) => c.toUpperCase());

function autoGuessMapping(ciphertext) {
  const clean = ciphertext.toUpperCase().replace(/[^A-Z]/g, "");
  const freq = {};
  for (const c of clean) freq[c] = (freq[c] || 0) + 1;
  const cipherOrder = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const mapping = {};
  cipherOrder.forEach((c, i) => { if (i < EN_ORDER.length) mapping[c] = EN_ORDER[i].toLowerCase(); });
  return mapping;
}

export default function SubstitutionView({ addHistory }) {
  const [ciphertext, setCiphertext] = useState("");
  const [mapping, setMapping] = useState({}); // { 'A': 'e', 'B': 't', ... } cipher → plain (lowercase)
  const [selected, setSelected] = useState(null); // which cipher letter is selected
  const [hoveredPlain, setHoveredPlain] = useState(null);

  const decoded = useMemo(() => applyMapping(ciphertext, mapping), [ciphertext, mapping]);
  const freq = useMemo(() => freqAnalysis(ciphertext), [ciphertext]);

  // Frequency map for cipher letters
  const cipherFreqMap = useMemo(() => {
    const map = {};
    for (const r of freq) map[r.char.toUpperCase()] = parseFloat(r.pct);
    return map;
  }, [freq]);

  const mappedPlain = new Set(Object.values(mapping)); // plain letters already in use

  const selectCipher = (letter) => {
    setSelected(selected === letter ? null : letter);
  };

  const assignPlain = (plainLetter) => {
    if (!selected) return;
    setMapping(m => {
      const newMap = { ...m };
      // Remove existing assignment to this plain letter
      for (const [k, v] of Object.entries(newMap)) { if (v === plainLetter) delete newMap[k]; }
      if (newMap[selected] === plainLetter) delete newMap[selected]; // toggle off
      else newMap[selected] = plainLetter;
      return newMap;
    });
    setSelected(null);
  };

  const clearLetter = (cipher) => {
    setMapping(m => { const n = { ...m }; delete n[cipher]; return n; });
  };

  const resetAll = () => { setMapping({}); setSelected(null); };

  const autoFill = () => {
    setMapping(autoGuessMapping(ciphertext));
    setSelected(null);
  };

  const mappedCount = Object.keys(mapping).length;
  const totalUnique = new Set(ciphertext.toUpperCase().replace(/[^A-Z]/g, "")).size;

  return (
    <div>
      <div className="section-header">
        <h3>Substitution Cipher Solver</h3>
        <p>
          Click a cipher letter (top row) to select it, then click the plain letter (bottom row) to map it.
          The decoded text updates live.
        </p>
      </div>

      {/* Input */}
      <div className="card" style={{ marginBottom: 12 }}>
        <label>Ciphertext</label>
        <textarea
          value={ciphertext}
          onChange={e => { setCiphertext(e.target.value); setMapping({}); setSelected(null); }}
          placeholder="Paste substitution cipher text here…"
          rows={4}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={autoFill}>
            Auto-Guess (frequency) ↗
          </button>
          <button className="btn btn-ghost" onClick={resetAll}>Reset Mapping</button>
        </div>
      </div>

      {ciphertext && (
        <>
          {/* Progress */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              {mappedCount} / {totalUnique} unique letters mapped
            </span>
            {selected && (
              <span style={{ fontSize: 12, color: "#fbbf24", fontWeight: 600 }}>
                Selected: <b>{selected}</b> — now click a plain letter below
              </span>
            )}
          </div>

          {/* Mapping interface */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-title">Letter Mapping (cipher → plain)</div>

            {/* Cipher row */}
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>CIPHER LETTERS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
              {ALPHA.map(letter => {
                const inText = cipherFreqMap[letter] !== undefined;
                const isMapped = !!mapping[letter];
                const isSelected = selected === letter;
                return (
                  <div
                    key={letter}
                    onClick={() => inText && selectCipher(letter)}
                    style={{
                      width: 40, textAlign: "center", cursor: inText ? "pointer" : "default",
                      opacity: inText ? 1 : 0.2,
                    }}
                  >
                    <div style={{
                      padding: "5px 0", borderRadius: 5, fontSize: 13, fontWeight: 700,
                      background: isSelected ? "#1d4ed8" : isMapped ? "#14532d44" : "#1e293b",
                      color: isSelected ? "#fff" : isMapped ? "#86efac" : "#94a3b8",
                      border: isSelected ? "2px solid #3b82f6" : "2px solid transparent",
                      transition: ".1s",
                    }}>
                      {letter}
                    </div>
                    <div style={{
                      fontSize: 9, color: "#475569", marginTop: 1,
                    }}>
                      {(cipherFreqMap[letter] || 0).toFixed(1)}%
                    </div>
                    {isMapped && (
                      <div style={{
                        fontSize: 11, color: "#86efac", fontWeight: 600,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 2,
                      }}>
                        {mapping[letter]}
                        <span
                          onClick={e => { e.stopPropagation(); clearLetter(letter); }}
                          style={{ color: "#ef4444", cursor: "pointer", fontSize: 9, lineHeight: 1 }}
                        >✕</span>
                      </div>
                    )}
                    {!isMapped && <div style={{ fontSize: 11, color: "#334155" }}>·</div>}
                  </div>
                );
              })}
            </div>

            {/* Plain letter row */}
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>PLAIN LETTERS (click to assign)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {ALPHA.map(letter => {
                const plain = letter.toLowerCase();
                const alreadyUsed = mappedPlain.has(plain);
                const isHovered = hoveredPlain === plain;
                return (
                  <div
                    key={letter}
                    onClick={() => selected && assignPlain(plain)}
                    onMouseEnter={() => setHoveredPlain(plain)}
                    onMouseLeave={() => setHoveredPlain(null)}
                    style={{
                      width: 40, textAlign: "center",
                      cursor: selected ? "pointer" : "default",
                    }}
                  >
                    <div style={{
                      padding: "5px 0", borderRadius: 5, fontSize: 13, fontWeight: 700,
                      background: isHovered && selected ? "#1e40af" : alreadyUsed ? "#1e293b88" : "#1e293b",
                      color: alreadyUsed ? "#475569" : "#e2e8f0",
                      border: isHovered && selected ? "2px solid #3b82f6" : "2px solid transparent",
                      transition: ".1s",
                      opacity: alreadyUsed ? 0.5 : 1,
                    }}>
                      {plain}
                    </div>
                    {alreadyUsed && (
                      <div style={{ fontSize: 9, color: "#475569" }}>used</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Frequency analysis */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-title">Cipher Frequency vs English</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "0 16px" }}>
              {freq.slice(0, 20).map(r => {
                const cl = r.char.toUpperCase();
                const enExpected = EN_FREQ[r.char] || 0;
                return (
                  <div key={r.char} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "2px 0", fontSize: 12,
                    cursor: "pointer",
                  }} onClick={() => selectCipher(cl)}>
                    <span style={{
                      width: 18, fontWeight: 700, fontSize: 13,
                      color: selected === cl ? "#fbbf24" : mapping[cl] ? "#86efac" : "#93c5fd",
                    }}>{cl}</span>
                    <span style={{ width: 18, color: "#475569", fontSize: 11 }}>→</span>
                    <span style={{
                      width: 16, fontWeight: 600, fontSize: 12,
                      color: mapping[cl] ? "#86efac" : "#334155",
                    }}>{mapping[cl] || "·"}</span>
                    <div style={{ flex: 1, background: "#1e293b", borderRadius: 2, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${(parseFloat(r.pct) / 13) * 100}%`, background: "#3b82f6", height: "100%" }} />
                    </div>
                    <span style={{ width: 32, textAlign: "right", color: "#64748b" }}>{r.pct}%</span>
                    <span style={{ width: 28, textAlign: "right", color: "#334155", fontSize: 10 }}>{enExpected.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Decoded output */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div className="card-title" style={{ margin: 0 }}>Decoded Text</div>
              {decoded && <CopyBtn text={decoded} />}
            </div>
            <div style={{
              background: "#070b16", border: "1px solid #1e293b", borderRadius: 6,
              padding: "10px 12px", fontFamily: "monospace", fontSize: 13,
              lineHeight: 1.8, wordBreak: "break-all", whiteSpace: "pre-wrap",
            }}>
              {decoded.split("").map((c, i) => {
                const isMapped = c !== "·" && c !== ciphertext[i];
                const isUnmapped = c === "·";
                return (
                  <span key={i} style={{
                    color: isUnmapped ? "#334155" : isMapped ? "#86efac" : "#e2e8f0",
                  }}>{c}</span>
                );
              })}
            </div>
            <div className="info-box" style={{ marginTop: 10 }}>
              <span style={{ color: "#86efac" }}>█</span> Mapped letters &nbsp;
              <span style={{ color: "#334155" }}>█</span> Unmapped (·) &nbsp;
              Click cipher letters in the frequency table above to quickly select them.
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 10 }}
              onClick={() => addHistory("Substitution Solve", ciphertext.slice(0, 30), decoded.slice(0, 60))}
            >
              Log to History
            </button>
          </div>
        </>
      )}
    </div>
  );
}
