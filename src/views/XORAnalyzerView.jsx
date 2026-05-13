import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { xorEnc, xorDec }                             from "../crypto/xor.js";
import { bfXor }                                       from "../crypto/analysis.js";
import { crackRepeatingXor, cribDrag }                 from "../crypto/xorAdvanced.js";
import { CopyBtn }                                     from "../components/Output.jsx";

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debouncedValue;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isHex(s) {
  const t = s.replace(/\s+/g, "");
  return /^[0-9a-fA-F]+$/.test(t) && t.length % 2 === 0;
}
function hexToBytes(h) {
  const clean = h.replace(/\s+/g, "");
  return new Uint8Array(clean.match(/.{2}/g).map(b => parseInt(b, 16)));
}

// ── Heuristic hint banner ─────────────────────────────────────────────────────
function HintBanner({ text, numInputs }) {
  const bytes = useMemo(() => {
    if (!text) return [];
    try { return isHex(text) ? hexToBytes(text) : []; } catch { return []; }
  }, [text]);
  const len = bytes.length || text.length;

  if (numInputs >= 2) return (
    <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:6,
      padding:"8px 12px", marginBottom:12, fontSize:12, color:"#7dd3fc" }}>
      💡 Multiple ciphertexts detected — <strong>Crib Drag</strong> is most effective when
      you know a fragment of the plaintext.
    </div>
  );
  if (len > 80) return (
    <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:6,
      padding:"8px 12px", marginBottom:12, fontSize:12, color:"#7dd3fc" }}>
      💡 Long ciphertext → try <strong>Repeating-key Crack</strong> (Kasiski/IC analysis).
    </div>
  );
  if (len > 0 && len <= 80) return (
    <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:6,
      padding:"8px 12px", marginBottom:12, fontSize:12, color:"#7dd3fc" }}>
      💡 Short ciphertext → try <strong>Single-byte Brute Force</strong> first.
    </div>
  );
  return null;
}

// ── Encrypt / Decrypt tab ─────────────────────────────────────────────────────
function EncDecTab({ addHistory }) {
  const [text, setText] = useState("");
  const [key, setKey]   = useState("");
  const [mode, setMode] = useState("enc");

  const out = useMemo(() => {
    if (!text || !key) return "";
    try { return mode === "enc" ? xorEnc(text, key) : xorDec(text, key); } catch { return "Error"; }
  }, [text, key, mode]);

  return (
    <div>
      <p style={{ fontSize:12, color:"var(--text-2)", marginBottom:12 }}>
        Bitwise XOR with a repeating key. Encrypt converts plaintext → hex; decrypt converts hex → plaintext.
      </p>
      <div className="card" style={{ marginBottom:12 }}>
        <div className="tabs-wrap" style={{ marginBottom:10 }}>
          {[["enc","Encrypt (→ hex)"],["dec","Decrypt (hex →)"]].map(([m,l]) => (
            <button key={m} className={`tab${mode===m?" active":""}`} onClick={() => setMode(m)}>{l}</button>
          ))}
        </div>
        <label>{mode === "enc" ? "Plaintext" : "Hex ciphertext"}</label>
        <textarea rows={3} value={text} onChange={e => setText(e.target.value)}
          placeholder={mode === "enc" ? "Enter plaintext…" : "Enter hex string…"} />
        <div style={{ marginTop:8 }}>
          <label>Key</label>
          <input value={key} onChange={e => setKey(e.target.value)} placeholder="XOR key (text or hex 0x…)" />
        </div>
      </div>
      {out && (
        <div className="card">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <span className="card-title">Output</span>
            <CopyBtn text={out} />
          </div>
          <pre style={{ background:"var(--bg-output)", padding:8, borderRadius:4, fontSize:12,
            color:"var(--output-col)", wordBreak:"break-all", whiteSpace:"pre-wrap" }}>{out}</pre>
          <button className="btn btn-ghost btn-sm" style={{ marginTop:6 }}
            onClick={() => addHistory?.(`XOR ${mode}`, text.slice(0,30), out.slice(0,60))}>
            Save to History
          </button>
        </div>
      )}
    </div>
  );
}

// ── Single-byte Brute Force tab ───────────────────────────────────────────────
function BruteTab({ addHistory }) {
  const [hex, setHex]           = useState("");
  const [results, setResults]   = useState([]);
  const [running, setRunning]   = useState(false);
  const [hexError, setHexError] = useState(null);

  const run = () => {
    if (running) return; // prevent double execution
    const clean = hex.replace(/\s+/g, "");
    if (!clean.match(/^[0-9a-fA-F]+$/)) { setHexError("Input must be valid hex (0-9, a-f)."); return; }
    if (clean.length % 2 !== 0) { setHexError("Hex string must have an even number of characters."); return; }
    setHexError(null);
    setRunning(true);
    // Yield to UI before blocking computation
    setTimeout(() => {
      const r = bfXor(hex).map(x => ({
        ...x,
        keyChar: x.key >= 32 && x.key < 127 ? String.fromCharCode(x.key) : `0x${x.key.toString(16).padStart(2,"0")}`,
        keyHex:  x.key.toString(16).padStart(2,"0"),
        printableRatio: x.printRatio ?? (x.text ? x.text.split("").filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127).length / x.text.length : 0),
      }));
      setResults(r);
      if (r[0]) addHistory?.("XOR Brute Force", hex.slice(0,20),
        `Key 0x${r[0].keyHex}: ${r[0].text?.slice(0,40)}`);
      setRunning(false);
    }, 0);
  };
  const maxScore = results.length ? Math.max(...results.map(r => r.score)) : 1;

  return (
    <div>
      <p style={{ fontSize:12, color:"var(--text-2)", marginBottom:12 }}>
        Tries all 256 single-byte XOR keys and scores by English frequency, word matches, and flag patterns.
        Best for short ciphertexts (under ~80 bytes).
      </p>
      <div className="card" style={{ marginBottom:12 }}>
        <label>Hex ciphertext</label>
        <textarea rows={3} value={hex} onChange={e => { setHex(e.target.value); setHexError(null); }}
          placeholder="e.g. 1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b3736"
          style={{ fontFamily:"monospace" }} />
        {hexError && <div style={{ fontSize:11, color:"var(--red)", marginTop:4 }}>⚠ {hexError}</div>}
        <button className="btn btn-primary" style={{ marginTop:8, width:"100%" }} onClick={run} disabled={running || !hex.trim()}>
          {running ? "⏳ Scanning…" : "Brute Force 256 Keys ↗"}
        </button>
      </div>
      {results.length > 0 && (
        <div>
          {results.slice(0,16).map((r, i) => (
            <div key={i} className="card" style={{ marginBottom:6, padding:"8px 12px",
              borderLeft:`3px solid ${r.hasFlag?"var(--green)":i===0?"var(--green)":i<3?"var(--accent)":"var(--border)"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--accent)" }}>
                  Key: 0x{r.keyHex} ({r.keyChar})
                  {r.hasFlag && <span style={{ marginLeft:8, color:"var(--green)", fontWeight:700 }}>🏁 FLAG</span>}
                </span>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <div style={{ width:80, height:3, background:"var(--bg-hover)", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ width:`${(r.score/maxScore)*100}%`, height:"100%",
                      background: r.hasFlag?"var(--green)":i===0?"var(--green)":"var(--accent)" }} />
                  </div>
                  <span style={{ fontSize:10, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>
                    {r.score.toFixed(0)}
                  </span>
                  <CopyBtn text={r.text} />
                </div>
              </div>
              <div style={{ fontSize:12, color:"var(--text-1)", marginTop:4,
                wordBreak:"break-all", fontFamily:"var(--font-mono)" }}>{r.text?.slice(0,120)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Repeating-key Crack tab ───────────────────────────────────────────────────
function RepeatKeyTab({ addHistory }) {
  const [hex, setHex]       = useState("");
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(0);

  const run = () => {
    const r = crackRepeatingXor(hex);
    setResult(r);
    setSelected(0);
    if (r.results?.[0])
      addHistory?.("XOR Repeating-Key", hex.slice(0,20),
        `Key "${r.results[0].keyStr}" → ${r.results[0].decrypted.slice(0,40)}`);
  };
  const best = result?.results?.[selected];

  return (
    <div>
      <p style={{ fontSize:12, color:"var(--text-2)", marginBottom:12 }}>
        Kasiski + IC key-length analysis, then solves each column with single-byte brute force.
        Effective for long ciphertexts (100+ hex chars).
      </p>
      <div className="card" style={{ marginBottom:12 }}>
        <label>Hex ciphertext (repeating-key XOR)</label>
        <textarea rows={5} value={hex} onChange={e => { setHex(e.target.value); setResult(null); }}
          placeholder={"0b3637272a2b2e63622c2e69692a23693a2a3c6324202d623d63343c2a26226324272765272\na2282b2f20430a652e2c652a3124333a653e2b2027630c692b20283165286326302e27282f"}
          style={{ fontFamily:"monospace", fontSize:12 }} />
        <button className="btn btn-primary" style={{ marginTop:8, width:"100%" }} onClick={run}>
          Crack Repeating-Key XOR ↗
        </button>
      </div>
      {result?.error && <div style={{ color:"var(--red)", fontSize:13, marginBottom:12 }}>{result.error}</div>}
      {result?.results?.length > 0 && (
        <>
          <div className="card" style={{ marginBottom:12 }}>
            <div className="card-title" style={{ marginBottom:8 }}>Key Length Candidates</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {result.results.map((r, i) => (
                <button key={i} onClick={() => setSelected(i)}
                  style={{ padding:"6px 14px", borderRadius:6, border:"none", cursor:"pointer",
                    fontSize:12, fontWeight:600,
                    background: selected===i ? "var(--accent)" : "var(--bg-card-2)",
                    color: selected===i ? "#000" : "var(--text-2)" }}>
                  len={r.keyLen} (score {r.normalizedScore?.toFixed(2)})
                </button>
              ))}
            </div>
          </div>
          {best && (
            <div className="card">
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <div>
                  <span className="card-title">Key: </span>
                  <code style={{ color:"var(--accent)", fontSize:13 }}>{best.keyStr}</code>
                  <span style={{ fontSize:11, color:"var(--text-3)", marginLeft:8 }}>
                    (hex: {best.keyHex})
                  </span>
                </div>
                <CopyBtn text={best.decrypted} />
              </div>
              <pre style={{ background:"var(--bg-output)", padding:8, borderRadius:4, fontSize:12,
                color:"var(--output-col)", whiteSpace:"pre-wrap", wordBreak:"break-all",
                maxHeight:200, overflow:"auto" }}>{best.decrypted}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Crib Drag tab ─────────────────────────────────────────────────────────────
function CribDragTab({ addHistory }) {
  const [hex, setHex]   = useState("");
  const [crib, setCrib] = useState("");
  const [result, setResult] = useState(null);

  const run = () => {
    if (!hex || !crib) return;
    let r;
    try {
      r = cribDrag(hex, crib);
    } catch(e) {
      setResult({ error: `Crib drag unavailable: ${e?.message ?? e}` });
      return;
    }
    setResult(r);
    addHistory?.("Crib Drag", `"${crib}" on ${hex.slice(0,20)}…`,
      r[0] ? `pos ${r[0].position}: ${r[0].keyFragment}` : "no result");
  };

  return (
    <div>
      <p style={{ fontSize:12, color:"var(--text-2)", marginBottom:12 }}>
        Drag a known plaintext fragment (crib) across the ciphertext to recover key bytes.
        Useful when you know part of the plaintext — e.g. "the", "flag&#123;&#125;", "http".
      </p>
      <div className="card" style={{ marginBottom:12 }}>
        <label>Hex ciphertext</label>
        <textarea rows={3} value={hex} onChange={e => setHex(e.target.value)}
          style={{ fontFamily:"monospace", fontSize:12 }} />
        <label style={{ marginTop:8 }}>Known plaintext fragment (crib)</label>
        <input value={crib} onChange={e => setCrib(e.target.value)}
          placeholder='e.g. "the" or "flag{...}" or "http"' />
        <button className="btn btn-primary" style={{ marginTop:8, width:"100%" }} onClick={run}
          disabled={!hex || !crib}>
          Drag Crib ↗
        </button>
      </div>
      {result && (
        result.error ? (
          <div style={{ background:"#7f1d1d22", border:"1px solid #ef444455", borderRadius:6,
            padding:"12px 14px", color:"#f87171", fontSize:13 }}>
            ⚠️ {result.error}
          </div>
        ) :
        result.length === 0 ? (
          <div style={{ color:"var(--text-2)", padding:16 }}>No plausible positions found.</div>
        ) : (
          <div>
            <div className="card-title" style={{ marginBottom:8 }}>
              Crib positions — plausible key fragments:
            </div>
            {result.slice(0,20).map((r, i) => (
              <div key={i} className="card" style={{ marginBottom:6, padding:"8px 12px" }}>
                <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontSize:11, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>
                    pos {r.position}
                  </span>
                  <span style={{ fontSize:12, color:"var(--accent)", fontFamily:"var(--font-mono)" }}>
                    key fragment: {r.keyFragment}
                  </span>
                  <span style={{ fontSize:10, color:"var(--text-3)" }}>score {r.score?.toFixed(1)}</span>
                </div>
                <div style={{ fontSize:12, color:"var(--text-1)", fontFamily:"var(--font-mono)" }}>
                  {r.plaintext}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function XORAnalyzerView({ addHistory }) {
  const [tab, setTab] = useState("encdec");
  const [globalInput, setGlobalInput] = useState("");

  return (
    <div>
      <div className="section-header">
        <h3>⊕ XOR Analyzer</h3>
        <p>Encrypt, decrypt, brute-force, and crack XOR ciphers — single-byte, repeating-key, and crib dragging.</p>
      </div>

      <div className="tabs-wrap">
        {[
          ["encdec",  "Encrypt / Decrypt"],
          ["brute",   "Single-byte Brute Force"],
          ["repeating","Repeating-key Crack"],
          ["crib",    "Crib Drag"],
        ].map(([id, label]) => (
          <button key={id} className={`tab${tab===id?" active":""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <HintBanner text={globalInput} numInputs={1} />

      {tab === "encdec"    && <EncDecTab    addHistory={addHistory} />}
      {tab === "brute"     && <BruteTab     addHistory={addHistory} />}
      {tab === "repeating" && <RepeatKeyTab addHistory={addHistory} />}
      {tab === "crib"      && <CribDragTab  addHistory={addHistory} />}
    </div>
  );
}
