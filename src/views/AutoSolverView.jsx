import { useState, useContext } from "react";
import { autoSolve } from "../crypto/autoSolver.js";
import { CopyBtn } from "../components/Output.jsx";
import { PerfBadge } from "../components/TerminalLog.jsx";
import { BeginnerContext } from "../App.jsx";

// ── Category → accent color ─────────────────────────────────────────────────
const CAT_COLOR = {
  "Encoding":            "#00d4ff",
  "Classical":           "#a78bfa",
  "XOR":                 "#ffd700",
  "Web Crypto":          "#34d399",
  "Encrypted/Compressed":"#ff3d5a",
  "RSA/PKI":             "#f472b6",
  "Hash":                "#fb923c",
  "CTF Pattern":         "#00e87a",
  "Info":                "#5a8ab0",
};

const TOOL_LABELS = {
  base64:"Base64", converter:"Base Converter", morse:"Morse Code", modernenc:"Modern Encoding",
  rot13:"ROT-13", bf_caesar:"Caesar Bruteforce", vigcrack:"Vigenère Crack",
  atbash:"Atbash", substitution:"Substitution Solver", bf_xor:"XOR Bruteforce",
  xorcracker:"XOR Cracker", jwt:"JWT Inspector", entropy:"Entropy Visualizer",
  pipeline:"Pipeline", rsa:"RSA Attacks", hashid:"Hash Identifier",
  hashcracker:"Hash Cracker", lsbstego:"LSB Steganography",
  autosolver:"Auto-Solver", classicalextra:"Classical Extra",
};

// ── Quick example sets ───────────────────────────────────────────────────────
const EXAMPLES_BASIC = [
  { label:"ROT-13",    input:"uryyb_jbeyg",                                     hint:"shift-13" },
  { label:"Caesar",    input:"Gur synt vf: synt{pnrfne_vf_rnfl}",              hint:"flag inside" },
  { label:"Base64",    input:"ZmxhZ3tiYXNlNjRfaXNfbmljZX0=",                   hint:"decoded" },
  { label:"Hex",       input:"666c61677b6865785f69735f636f6f6c7d",              hint:"flag" },
  { label:"Binary",    input:"01100110 01101100 01100001 01100111",             hint:"ASCII" },
  { label:"Morse",     input:".... . .-.. .-.. --- / .-- --- .-. .-.. -..",    hint:"hello world" },
];

const EXAMPLES_ADVANCED = [
  { label:"B64+Zlib",  input:"eJyrVkrLz1eyUkpKLFKqBQA7WwYJ",                  hint:"compressed" },
  { label:"Flag wrap", input:"VishwaCTF{dGhpcyBpcyBiYXNlNjQ=}",               hint:"decoded inner" },
  { label:"Layered",   input:"Vm0wd2QyUXlVWGxWV0doVlYwNWFjRlV3WkRSV1JteFZVMjA1VTFadGVEWlhhMk0x", hint:"B64×n" },
  { label:"URL-enc",   input:"flag%7Burl_encoded%7D",                           hint:"percent" },
  { label:"Base32",    input:"MFRA======",                                      hint:"TOTP style" },
  { label:"Bacon",     input:"AABAAABABAABABAABAABABAABABBA",                    hint:"2-letter" },
  { label:"Reversed",  input:"}3lppma_si_esrever{galf",                        hint:"backwards" },
  { label:"JWT",       input:"eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJndWVzdCIsInJvbGUiOiJhZG1pbiJ9.", hint:"alg:none!" },
];

// ── Sub-components ───────────────────────────────────────────────────────────
function LayerBadge({ count }) {
  if (!count || count < 2) return null;
  return (
    <span style={{
      background:"#7c3aed18", color:"#a78bfa",
      padding:"1px 6px", borderRadius:4, fontSize:9,
      fontWeight:700, border:"1px solid #7c3aed30",
      fontFamily:"var(--font-mono)", letterSpacing:".5px",
    }}>
      {count}× LAYER{count > 1 ? "S" : ""}
    </span>
  );
}

function ConfBar({ pct, color }) {
  return (
    <div style={{ background:"var(--bg-hover)", borderRadius:2, height:2, overflow:"hidden", marginTop:5 }}>
      <div style={{ width:`${pct}%`, height:"100%", background:color, transition:".4s",
        boxShadow:`0 0 6px ${color}55` }} />
    </div>
  );
}

function ResultCard({ r, onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  const color = CAT_COLOR[r.category] || "var(--text-3)";
  const CLIP = 200;
  const isLong = r.output.length > CLIP;

  return (
    <div style={{
      background: r.hasFlag ? "#001a0a" : "var(--bg-card)",
      border:`1px solid ${r.hasFlag ? "var(--green)44" : r.category === "CTF Pattern" ? "#00e87a22" : "var(--border)"}`,
      borderRadius:6, padding:"13px 14px", marginBottom:7,
      boxShadow: r.hasFlag ? "0 0 16px #00e87a0a" : "none",
      transition:"border-color .15s",
    }}>
      {/* Header row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", minWidth:0 }}>
          {r.hasFlag && <span style={{ fontSize:14 }}>🏁</span>}
          <span style={{ fontWeight:700, color:"var(--text-1)", fontSize:12, fontFamily:"var(--font-ui)" }}>
            {r.method}
          </span>
          <span style={{
            background:`${color}14`, color, padding:"1px 7px", borderRadius:3,
            fontSize:9, fontWeight:700, border:`1px solid ${color}28`,
            fontFamily:"var(--font-mono)", letterSpacing:"1px", textTransform:"uppercase",
          }}>
            {r.category}
          </span>
          <LayerBadge count={r.layers} />
          {r.note && <span style={{ fontSize:10, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>{r.note}</span>}
        </div>
        <span style={{
          fontWeight:800, fontSize:12, flexShrink:0,
          fontFamily:"var(--font-mono)",
          color: r.confidence > 80 ? "var(--green)" : r.confidence > 55 ? "var(--yellow)" : "var(--text-3)",
        }}>
          {r.confidence}%
        </span>
      </div>

      <ConfBar pct={r.confidence} color={r.hasFlag ? "var(--green)" : color} />

      {/* Output */}
      <div style={{ marginTop:10, position:"relative" }}>
        <CopyBtn text={r.output} />
        <div style={{
          background:"var(--bg-output)", border:"1px solid var(--border-sub)",
          borderRadius:5, padding:"8px 10px",
          fontFamily:"var(--font-mono)", fontSize:11.5,
          color: r.hasFlag ? "var(--green)" : "var(--output-col)",
          wordBreak:"break-all", whiteSpace:"pre-wrap", lineHeight:1.6,
          maxHeight: expanded ? "600px" : "140px",
          overflow: expanded ? "auto" : "hidden",
          transition:"max-height .2s",
        }}>
          {r.output}
        </div>
        {isLong && (
          <button onClick={() => setExpanded(v => !v)}
            style={{ fontSize:10, color:"var(--text-3)", background:"none", border:"none",
                     cursor:"pointer", marginTop:3, fontFamily:"var(--font-mono)" }}>
            {expanded ? "▲ collapse" : "▼ show all"}
          </button>
        )}
      </div>

      {/* Navigation */}
      {r.tool && TOOL_LABELS[r.tool] && (
        <button className="btn btn-ghost btn-sm"
          style={{ marginTop:8, fontSize:9.5, letterSpacing:".5px" }}
          onClick={() => onNavigate?.(r.tool)}>
          OPEN IN {TOOL_LABELS[r.tool].toUpperCase()} →
        </button>
      )}
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────
export default function AutoSolverView({ addHistory, onNavigate }) {
  const [input, setInput]           = useState("");
  const [results, setResults]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [elapsed, setElapsed]       = useState(null);
  const [showAdv, setShowAdv]       = useState(false);
  const beginner = useContext(BeginnerContext);

  const run = async () => {
    if (!input.trim()) return;
    setLoading(true); setResults(null); setElapsed(null);
    const t0 = performance.now();
    try {
      const r = await autoSolve(input);
      const ms = Math.round(performance.now() - t0);
      setResults(r);
      setElapsed(ms);
      addHistory?.("Auto-Solver", input.slice(0, 30),
        r.length ? `${r.length} candidates — best: ${r[0].method} · ${ms}ms` : "No candidates");
    } finally { setLoading(false); }
  };

  const flagHits = results?.filter(r => r.hasFlag) || [];
  const others   = results?.filter(r => !r.hasFlag) || [];
  const examples = showAdv ? [...EXAMPLES_BASIC, ...EXAMPLES_ADVANCED] : EXAMPLES_BASIC;

  const ALGORITHMS = [
    "Base64","Zlib","Gzip","Hex","Binary","Base32","Base58",
    "Morse","Caesar","ROT-13","ROT-47","Atbash","Bacon","Vigenère",
    "Substitution","XOR","JWT","RSA/PEM","URL","HTML","Unicode",
    "Hash-ID","Flag-Wrapper","Entropy",
  ];

  return (
    <div>
      {/* Section header */}
      <div className="section-header">
        <h3>⚡ Auto-Solver</h3>
        <p>
          Cascade detection across {ALGORITHMS.length} algorithms — layered encoding, compression, classical ciphers, XOR, JWT, RSA, and flag wrapper extraction.
          Ranks candidates by confidence score.
        </p>
      </div>

      {/* Beginner guide */}
      {beginner && (
        <div className="guide-banner" style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"var(--accent)", marginBottom:9, letterSpacing:"2px" }}>HOW TO USE</div>
          {[
            ["1","Copy any suspicious string from a CTF — ciphertext, hash, token, or encoded data."],
            ["2","Paste it below and click Auto-Solve. 24 algorithms run automatically."],
            ["3","Results ranked by confidence. 🏁 flag icon = decoded flag found!"],
            ["4","Click OPEN IN [TOOL] to go deeper with the specialist tool."],
          ].map(([n, txt]) => (
            <div className="guide-step" key={n}>
              <div className="guide-num">{n}</div>
              <div>{txt}</div>
            </div>
          ))}
        </div>
      )}

      {/* Input card */}
      <div className="card" style={{ marginBottom:12 }}>
        <div className="card-title">Input — paste anything</div>
        <textarea
          value={input}
          onChange={e => { setInput(e.target.value); setResults(null); }}
          onKeyDown={e => { if (e.ctrlKey && e.key === "Enter") run(); }}
          placeholder={"eJyrVkrLz1eyUkpKLFKqBQA7WwYJ        — Base64+Zlib\nVishwaCTF{dGhpcyBpcyBiYXNlNjQ=}  — Flag wrapper\nuryyb_jbeyg                      — ROT-13\n666c61677b68657878787d           — Hex flag\n$2b$12$...                       — bcrypt"}
          rows={5}
          style={{ fontFamily:"var(--font-mono)", fontSize:12, marginBottom:10, lineHeight:1.7 }}
        />

        {/* Algorithm chips */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginBottom:10 }}>
          {ALGORITHMS.map(a => (
            <span key={a} className="chip" style={{ fontSize:9.5 }}>{a}</span>
          ))}
        </div>

        {/* Quick examples */}
        <div style={{ marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
            <span style={{ fontSize:9, color:"var(--text-3)", letterSpacing:"1.5px", fontFamily:"var(--font-mono)", textTransform:"uppercase" }}>
              Quick Examples
            </span>
            <button className="btn btn-ghost btn-sm"
              style={{ fontSize:9, letterSpacing:"1px" }}
              onClick={() => setShowAdv(v => !v)}>
              {showAdv ? "▲ LESS" : "▼ ADVANCED"}
            </button>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
            {examples.map(ex => (
              <button key={ex.label} className="btn btn-ghost btn-sm"
                style={{ fontSize:10 }}
                title={`Hint: ${ex.hint}`}
                onClick={() => { setInput(ex.input); setResults(null); }}>
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button className="btn btn-primary" style={{ flex:1 }}
            onClick={run} disabled={loading || !input.trim()}>
            {loading ? "⏳ RUNNING CASCADE…" : "⚡ AUTO-SOLVE"}
          </button>
          <span style={{ fontSize:9, color:"var(--text-3)", fontFamily:"var(--font-mono)", letterSpacing:"1px" }}>CTRL+ENTER</span>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card" style={{ textAlign:"center", padding:"20px 14px" }}>
          <div style={{ color:"var(--text-2)", fontSize:11, marginBottom:10, letterSpacing:"1px", fontFamily:"var(--font-mono)" }}>
            RUNNING DETECTION CASCADE…
          </div>
          <div style={{ display:"flex", gap:4, justifyContent:"center", flexWrap:"wrap" }}>
            {ALGORITHMS.map(a => (
              <span key={a} className="chip" style={{ fontSize:9.5, animation:"pulse 1.5s infinite", animationDelay:`${Math.random()*800}ms` }}>{a}</span>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {results && results.length === 0 && (
        <div className="card">
          <div className="card-title">No Confident Candidates</div>
          <div style={{ color:"var(--text-2)", fontSize:12, lineHeight:1.8 }}>
            The input may be:
          </div>
          <div style={{ marginTop:8, display:"grid", gap:5 }}>
            {[
              ["🔒","Modern encryption (AES/RSA) — try Entropy Visualizer"],
              ["🔤","Monoalphabetic substitution — try Substitution Solver manually"],
              ["🖼️","Steganography — try LSB Steganography tool"],
              ["📏","Too short (need ≥ 4 chars for reliable detection)"],
              ["🔑","RSA/PEM — paste the full key block including -----BEGIN-----"],
              ["🧅","Deeply layered encoding — try Pipeline to chain transforms manually"],
            ].map(([icon, txt]) => (
              <div key={txt} style={{ fontSize:11.5, color:"var(--text-2)", display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ width:18, textAlign:"center" }}>{icon}</span>
                <span>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", fontSize:11, color:"var(--text-2)", fontFamily:"var(--font-mono)" }}>
              {results.length} CANDIDATE{results.length !== 1 ? "S" : ""} FOUND
              {flagHits.length > 0 && (
                <span style={{ color:"var(--green)", fontWeight:700, marginLeft:10 }}>
                  🏁 {flagHits.length} WITH FLAG!
                </span>
              )}
              {elapsed !== null && <PerfBadge ms={elapsed} />}
            </div>
            <div style={{ fontSize:9.5, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>
              sorted by confidence
            </div>
          </div>

          {/* Flag hits first — highlighted section */}
          {flagHits.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, fontWeight:700, color:"var(--green)", marginBottom:6,
                letterSpacing:"2px", fontFamily:"var(--font-mono)" }}>
                ─── 🏁 FLAG CAPTURED ────────────────────────
              </div>
              {flagHits.map((r, i) => <ResultCard key={i} r={r} onNavigate={onNavigate} />)}
            </div>
          )}

          {/* Other candidates */}
          {others.length > 0 && (
            <div>
              {flagHits.length > 0 && (
                <div style={{ fontSize:9, fontWeight:700, color:"var(--text-3)", marginBottom:6,
                  letterSpacing:"2px", fontFamily:"var(--font-mono)" }}>
                  ─── OTHER CANDIDATES ────────────────────────
                </div>
              )}
              {others.map((r, i) => <ResultCard key={i} r={r} onNavigate={onNavigate} />)}
            </div>
          )}

          <div className="info-box" style={{ marginTop:10, fontSize:11 }}>
            <b>Confidence</b> = format match + English frequency (chi-squared + IC) + flag pattern bonus.<br/>
            <b>Purple badge</b> = multi-layer encoding detected. Click <b>OPEN IN [TOOL]</b> for deeper analysis.
          </div>
        </>
      )}
    </div>
  );
}
