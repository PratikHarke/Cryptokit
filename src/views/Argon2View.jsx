import { useState, useRef } from "react";
import {
  parseArgon2Hash,
  generateArgon2Hash,
  verifyArgon2Password,
  crackArgon2Dictionary,
} from "../crypto/argon2.js";

const WARN_COLOR  = { background:"#7c2d1222", border:"1px solid #f9731633", borderRadius:6, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#fb923c" };
const SUCCESS_BOX = { background:"#14532d22", border:"1px solid #22c55e55", borderRadius:6, padding:10, marginTop:10, fontSize:13, color:"#86efac" };
const ERROR_BOX   = { background:"#7f1d1d22", border:"1px solid #ef444455", borderRadius:6, padding:10, marginTop:10, fontSize:13, color:"#f87171" };
const INFO_BOX    = { background:"#1e293b", borderRadius:6, padding:10, marginTop:10, fontSize:12, color:"#94a3b8", fontFamily:"monospace" };

function TabBtn({ id, active, onClick, children }) {
  return (
    <button
      className={`tab${active ? " active" : ""}`}
      onClick={() => onClick(id)}
    >
      {children}
    </button>
  );
}

// ── Parse tab ─────────────────────────────────────────────────────────────────
function ParseTab() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);

  const run = () => setResult(parseArgon2Hash(input));

  return (
    <div>
      <div className="card" style={{ marginBottom:12 }}>
        <label>Argon2 PHC String</label>
        <textarea
          rows={3}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="$argon2id$v=19$m=65536,t=3,p=1$salt$hash"
          style={{ fontFamily:"monospace", fontSize:12 }}
        />
        <button onClick={run} style={{ marginTop:8 }}>Parse Hash</button>
      </div>

      {result && (
        result.error ? (
          <div style={ERROR_BOX}>❌ {result.error}</div>
        ) : (
          <div style={INFO_BOX}>
            {[
              ["Variant",       result.variant],
              ["Version",       result.version],
              ["Memory (KiB)",  result.m.toLocaleString()],
              ["Iterations",    result.t],
              ["Parallelism",   result.p],
              ["Salt (b64)",    result.salt],
              ["Hash (b64)",    result.hash],
            ].map(([k, v]) => (
              <div key={k} style={{ marginBottom:4 }}>
                <span style={{ color:"#64748b", minWidth:130, display:"inline-block" }}>{k}:</span>
                <span style={{ color:"#e2e8f0" }}>{v}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Generate tab ──────────────────────────────────────────────────────────────
function GenerateTab() {
  const [password, setPassword] = useState("");
  const [variant, setVariant]   = useState("argon2id");
  const [m, setM]               = useState(65536);
  const [t, setT]               = useState(3);
  const [p, setP]               = useState(1);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    const r = await generateArgon2Hash(password, { variant, m: Number(m), t: Number(t), p: Number(p) });
    setResult(r);
    setLoading(false);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom:12 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div>
            <label>Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Plaintext password" />
          </div>
          <div>
            <label>Variant</label>
            <select value={variant} onChange={e => setVariant(e.target.value)}>
              <option value="argon2id">argon2id (recommended)</option>
              <option value="argon2i">argon2i</option>
              <option value="argon2d">argon2d</option>
            </select>
          </div>
          <div>
            <label>Memory (KiB)</label>
            <input type="number" value={m} onChange={e => setM(e.target.value)} min={8} max={262144} />
          </div>
          <div>
            <label>Iterations (t)</label>
            <input type="number" value={t} onChange={e => setT(e.target.value)} min={1} max={20} />
          </div>
          <div>
            <label>Parallelism (p)</label>
            <input type="number" value={p} onChange={e => setP(e.target.value)} min={1} max={8} />
          </div>
        </div>
        <button onClick={run} disabled={loading || !password}>
          {loading ? "⏳ Hashing…" : "Generate Hash"}
        </button>
      </div>

      {result && (
        result.error ? (
          <div style={ERROR_BOX}>❌ {result.error}</div>
        ) : (
          <div style={INFO_BOX}>
            <div style={{ marginBottom:6 }}>
              <span style={{ color:"#64748b" }}>Encoded PHC:</span>
              <div style={{ color:"#86efac", wordBreak:"break-all", marginTop:4 }}>{result.encoded}</div>
            </div>
            <div>
              <span style={{ color:"#64748b" }}>Hash hex:</span>
              <div style={{ color:"#a5f3fc", wordBreak:"break-all", marginTop:4 }}>{result.hex}</div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ── Verify tab ────────────────────────────────────────────────────────────────
function VerifyTab() {
  const [hash,     setHash]     = useState("");
  const [password, setPassword] = useState("");
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    const r = await verifyArgon2Password(password, hash);
    setResult(r);
    setLoading(false);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom:12 }}>
        <label>Argon2 PHC String</label>
        <textarea
          rows={3}
          value={hash}
          onChange={e => setHash(e.target.value)}
          placeholder="$argon2id$v=19$m=65536,t=3,p=1$…"
          style={{ fontFamily:"monospace", fontSize:12 }}
        />
        <label style={{ marginTop:10 }}>Candidate Password</label>
        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          type="text"
          placeholder="Enter password to verify"
        />
        <button onClick={run} disabled={loading || !hash || !password} style={{ marginTop:8 }}>
          {loading ? "⏳ Verifying…" : "Verify Password"}
        </button>
      </div>

      {result && (
        result.error ? (
          <div style={ERROR_BOX}>❌ {result.error}</div>
        ) : result.match ? (
          <div style={SUCCESS_BOX}>✅ Password matches the hash.</div>
        ) : (
          <div style={ERROR_BOX}>❌ Password does NOT match.</div>
        )
      )}
    </div>
  );
}

// ── Dictionary attack tab ─────────────────────────────────────────────────────
function DictionaryTab() {
  const [hash,      setHash]     = useState("");
  const [wordlist,  setWordlist] = useState("");
  const [progress,  setProgress] = useState(null);
  const [result,    setResult]   = useState(null);
  const [running,   setRunning]  = useState(false);
  const abortRef = useRef(null);

  const run = async () => {
    const words = wordlist.split(/\r?\n/).map(w => w.trim()).filter(Boolean);
    if (!hash || words.length === 0) return;

    abortRef.current = new AbortController();
    setRunning(true);
    setResult(null);
    setProgress({ tried: 0, total: words.length, current: "" });

    const r = await crackArgon2Dictionary(hash, words, {
      signal: abortRef.current.signal,
      onProgress: (tried, total, current) =>
        setProgress({ tried, total, current }),
    });

    setResult(r);
    setRunning(false);
    setProgress(null);
  };

  const stop = () => { abortRef.current?.abort(); };

  return (
    <div>
      <div className="card" style={{ marginBottom:12 }}>
        <label>Argon2 PHC String</label>
        <textarea
          rows={3}
          value={hash}
          onChange={e => setHash(e.target.value)}
          placeholder="$argon2id$v=19$m=65536,t=3,p=1$…"
          style={{ fontFamily:"monospace", fontSize:12 }}
        />
        <label style={{ marginTop:10 }}>Wordlist (one password per line)</label>
        <textarea
          rows={8}
          value={wordlist}
          onChange={e => setWordlist(e.target.value)}
          placeholder={"password\n123456\nletmein\nadmin\nsecret\n…"}
          style={{ fontFamily:"monospace", fontSize:12 }}
        />
        <div style={{ display:"flex", gap:8, marginTop:8 }}>
          <button onClick={run} disabled={running || !hash || !wordlist}>
            {running ? "⏳ Attacking…" : "Start Dictionary Attack"}
          </button>
          {running && (
            <button onClick={stop} style={{ background:"#7f1d1d", color:"#fca5a5" }}>
              ■ Stop
            </button>
          )}
        </div>
      </div>

      {progress && (
        <div style={{ marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#64748b", marginBottom:4 }}>
            <span>Trying: <code style={{ color:"#e2e8f0" }}>{progress.current}</code></span>
            <span>{progress.tried} / {progress.total}</span>
          </div>
          <div style={{ background:"#1e293b", borderRadius:4, height:6 }}>
            <div
              style={{
                background:"#3b82f6",
                width:`${Math.min(100, (progress.tried / progress.total) * 100)}%`,
                height:"100%",
                borderRadius:4,
                transition:"width 0.1s",
              }}
            />
          </div>
        </div>
      )}

      {result && (
        result.error ? (
          <div style={ERROR_BOX}>❌ {result.error}</div>
        ) : result.found ? (
          <div style={SUCCESS_BOX}>
            ✅ Password found after {result.tried} attempt{result.tried !== 1 ? "s" : ""}:{" "}
            <code style={{ fontSize:14, fontWeight:700 }}>{result.password}</code>
          </div>
        ) : (
          <div style={ERROR_BOX}>
            ❌ No match found after {result.tried} candidate{result.tried !== 1 ? "s" : ""}. Try a larger wordlist.
          </div>
        )
      )}
    </div>
  );
}

// ── Root view ─────────────────────────────────────────────────────────────────
export default function Argon2View() {
  const [tab, setTab] = useState("parse");

  return (
    <div>
      <div className="section-header">
        <h3>🔐 Argon2 Analyzer</h3>
        <p>Parse, generate, verify, and dictionary-attack Argon2 PHC hashes.</p>
      </div>

      <div style={WARN_COLOR}>
        🔒 <strong>Argon2 cannot be decrypted.</strong> This tool can only <em>verify</em> candidate
        passwords or attempt a <em>dictionary attack</em>. Argon2 is memory-hard by design, so
        cracking will be slow in the browser — this is intentional. Use only on hashes you are
        authorized to test.
      </div>

      <div className="tabs-wrap">
        {[["parse","Parse Hash"],["generate","Generate"],["verify","Verify"],["dictionary","Dictionary Attack"]].map(([id, label]) => (
          <TabBtn key={id} id={id} active={tab === id} onClick={setTab}>{label}</TabBtn>
        ))}
      </div>

      {tab === "parse"      && <ParseTab />}
      {tab === "generate"   && <GenerateTab />}
      {tab === "verify"     && <VerifyTab />}
      {tab === "dictionary" && <DictionaryTab />}
    </div>
  );
}
