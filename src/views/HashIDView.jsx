import { useState } from "react";
import { identifyHash } from "../crypto/hash.js";

const CONF_STYLE = {
  "Very High": { bg:"#14532d44", col:"var(--green)", label:"Very High" },
  "High":      { bg:"#1e3a5f44", col:"var(--accent)", label:"High" },
  "Medium":    { bg:"#78350f44", col:"#fde68a", label:"Medium" },
  "Low":       { bg:"#1e1b4b44", col:"#a5b4fc", label:"Low" },
  "None":      { bg:"var(--bg-hover)", col:"var(--text-2)", label:"Unknown" },
};

const ATTACK_INFO = {
  "MD5":              { crackable:true,  tool:"Hash Cracker", time:"Seconds (GPU)",      note:"Rainbow tables exist; never use for passwords" },
  "SHA-1":            { crackable:true,  tool:"Hash Cracker", time:"Minutes–hours",       note:"SHAttered collision attack known" },
  "SHA-256":          { crackable:false, tool:null,           time:"Computationally infeasible", note:"Currently secure" },
  "SHA-512":          { crackable:false, tool:null,           time:"Computationally infeasible", note:"Very strong" },
  "NTLM":             { crackable:true,  tool:"Hash Cracker", time:"Seconds (GPU)",       note:"Weak without salting" },
  "bcrypt":           { crackable:false, tool:null,           time:"Very slow (by design)", note:"Adaptive cost factor slows brute force" },
  "Argon2id":         { crackable:false, tool:null,           time:"Very slow (by design)", note:"Winner of Password Hashing Competition" },
  "MD5crypt":         { crackable:true,  tool:null,           time:"Hours–days",           note:"Legacy Unix, deprecated" },
  "SHA-512crypt":     { crackable:false, tool:null,           time:"Slow by design",       note:"Modern Unix default" },
  "JWT (JSON Web Token)":{ crackable:false,tool:"jwt",        time:"N/A",                  note:"Not a hash — open in JWT Inspector" },
  "CRC-32":           { crackable:true,  tool:"Hash Cracker", time:"Instant",              note:"Not a cryptographic hash at all" },
};

const EXAMPLE_HASHES = [
  { type:"MD5",        hash:"5f4dcc3b5aa765d61d8327deb882cf99",         note:"MD5('password')" },
  { type:"SHA-1",      hash:"da39a3ee5e6b4b0d3255bfef95601890afd80709", note:"SHA-1('') — empty string" },
  { type:"SHA-256",    hash:"e3b0c44298fc1c149afbf4c8996fb924" + "27ae41e4649b934ca495991b7852b855", note:"SHA-256('')" },
  { type:"bcrypt",     hash:"$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", note:"bcrypt (cost=12)" },
  { type:"Argon2id",   hash:"$argon2id$v=19$m=65536,t=3,p=4$abc$hashhere", note:"Argon2id KDF" },
  { type:"SHA-512c",   hash:"$6$rounds=5000$saltsalt$hashvalue",           note:"Linux /etc/shadow" },
  { type:"NTLM",       hash:"8846f7eaee8fb117ad06bdd830b7586c",            note:"NTLM('password')" },
  { type:"JWT",        hash:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.abc", note:"JSON Web Token" },
];

export default function HashIDView({ addHistory }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);

  const run = () => {
    if (!text.trim()) return;
    const r = identifyHash(text.trim());
    setResults(r);
    addHistory?.("Hash ID", text.slice(0, 24), r.map(x => x.type).join(", "));
  };

  const loadExample = (hash) => { setText(hash); setResults(identifyHash(hash)); };

  const topResult = results[0];
  const attackInfo = topResult ? ATTACK_INFO[topResult.type] : null;

  return (
    <div>
      <div className="section-header">
        <h3>Hash Identification</h3>
        <p>Identifies 40+ hash types by structure, length, charset, and prefix patterns. Covers Unix crypt, KDFs, framework hashes, and PKI formats.</p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label>Hash / Password Hash / Token</label>
        <textarea value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && e.ctrlKey && run()}
          placeholder={"Paste any hash format here:\n  5f4dcc3b5aa765d61d8327deb882cf99\n  $2b$12$...\n  $argon2id$...\n  eyJhbGci..."} rows={4}
          style={{ fontFamily:"monospace", marginBottom:10 }} />
        <button className="btn btn-primary" style={{ width:"100%" }} onClick={run}>
          🔍 Identify Hash
        </button>
      </div>

      {/* Quick examples */}
      <div className="card" style={{ marginBottom:12 }}>
        <div className="card-title">Quick Examples — click to test</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {EXAMPLE_HASHES.map(e => (
            <button key={e.type} className="btn btn-ghost btn-sm"
              onClick={() => loadExample(e.hash)}
              style={{ fontSize:11 }}>
              {e.type}
            </button>
          ))}
        </div>
      </div>

      {results.length > 0 && (
        <>
          {/* Top match with attack info */}
          {topResult && (
            <div className="card" style={{ marginBottom:12, borderColor: CONF_STYLE[topResult.conf]?.col + "44" }}>
              <div className="card-title">Best Match</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:17, fontWeight:700, color:"var(--text-1)", marginBottom:3 }}>
                    {topResult.type}
                  </div>
                  <div style={{ fontSize:12, color:"var(--text-2)" }}>{topResult.note}</div>
                </div>
                <span style={{
                  background: CONF_STYLE[topResult.conf]?.bg,
                  color: CONF_STYLE[topResult.conf]?.col,
                  padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, flexShrink:0,
                }}>
                  {topResult.conf}
                </span>
              </div>
              {attackInfo && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:8 }}>
                  <div style={{ background:"var(--bg-output)", border:"1px solid var(--border)", borderRadius:6, padding:"8px 10px" }}>
                    <div style={{ fontSize:10, color:"var(--text-3)", marginBottom:2, textTransform:"uppercase", fontWeight:700 }}>Crackability</div>
                    <div style={{ fontSize:13, color: attackInfo.crackable ? "var(--red)" : "var(--green)", fontWeight:600 }}>
                      {attackInfo.crackable ? "⚠️ Crackable" : "✓ Resistant"}
                    </div>
                    <div style={{ fontSize:11, color:"var(--text-2)", marginTop:2 }}>{attackInfo.time}</div>
                  </div>
                  <div style={{ background:"var(--bg-output)", border:"1px solid var(--border)", borderRadius:6, padding:"8px 10px" }}>
                    <div style={{ fontSize:10, color:"var(--text-3)", marginBottom:2, textTransform:"uppercase", fontWeight:700 }}>Security Note</div>
                    <div style={{ fontSize:12, color:"var(--text-1)" }}>{attackInfo.note}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* All matches */}
          <div className="card" style={{ marginBottom:12 }}>
            <div className="card-title">All Matches ({results.length})</div>
            {results.map((r, i) => {
              const cs = CONF_STYLE[r.conf] || CONF_STYLE["None"];
              return (
                <div key={i} className="result-row">
                  <div>
                    <span style={{ fontWeight:600, color:"var(--text-1)", fontSize:13 }}>{r.type}</span>
                    <div style={{ fontSize:11, color:"var(--text-2)", marginTop:2 }}>{r.note}</div>
                  </div>
                  <span style={{ background:cs.bg, color:cs.col, padding:"2px 9px", borderRadius:20, fontSize:10.5, fontWeight:700, flexShrink:0, marginLeft:8 }}>
                    {cs.label}
                  </span>
                </div>
              );
            })}

            {/* Stats */}
            {text.trim() && (
              <div style={{ marginTop:10, padding:"8px 10px", background:"var(--bg-output)", border:"1px solid var(--border)", borderRadius:6, fontSize:12 }}>
                <span style={{ color:"var(--text-label)" }}>Length: </span>
                <span style={{ color:"var(--yellow)", fontWeight:600, marginRight:12 }}>{text.trim().length}</span>
                <span style={{ color:"var(--text-label)" }}>Hex-only: </span>
                <span style={{ color:"var(--yellow)", fontWeight:600, marginRight:12 }}>{/^[a-fA-F0-9]+$/.test(text.trim()) ? "Yes" : "No"}</span>
                <span style={{ color:"var(--text-label)" }}>Charset: </span>
                <span style={{ color:"var(--text-2)", fontFamily:"monospace", fontSize:11 }}>
                  {[...new Set(text.trim())].sort().join("").slice(0,32)}{text.trim().length > 32 ? "…" : ""}
                </span>
              </div>
            )}
          </div>

          {/* Reference card */}
          <div className="card">
            <div className="card-title">Hash Length Reference</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:6 }}>
              {[
                ["8 hex","CRC-32"],["32 hex","MD5 / NTLM"],["40 hex","SHA-1"],
                ["56 hex","SHA-224"],["64 hex","SHA-256"],["96 hex","SHA-384"],
                ["128 hex","SHA-512"],["$2b$","bcrypt"],["$argon2","Argon2"],
                ["$6$","SHA-512crypt"],["$P$","WordPress"],["eyJ…","JWT"],
              ].map(([k,v]) => (
                <div key={k} style={{ background:"var(--bg-output)", border:"1px solid var(--border)", borderRadius:5, padding:"5px 8px", fontSize:11 }}>
                  <span style={{ fontFamily:"monospace", color:"var(--yellow)" }}>{k}</span>
                  <span style={{ color:"var(--text-2)", marginLeft:6 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
