import { useState } from "react";
import { htmlEncode, htmlDecode, unicodeEscape, unicodeDecode, detectZeroWidth, stripZeroWidth, detectWhitespace, bruteforceJWTSecret, JWT_WORDLIST } from "../crypto/modernEncoding.js";
import Output from "../components/Output.jsx";
import { CopyBtn } from "../components/Output.jsx";

// ─── HTML Entities ────────────────────────────────────────────────────────────
function HTMLTab({ addHistory }) {
  const [text, setText] = useState(""); const [mode, setMode] = useState("dec");
  const out = text ? (mode==="enc" ? htmlEncode(text) : htmlDecode(text)) : "";
  return (
    <div>
      <div className="tabs-wrap">
        {["enc","dec"].map(m=><button key={m} className={`tab${mode===m?" active":""}`} onClick={()=>setMode(m)}>{m==="enc"?"Encode":"Decode"}</button>)}
      </div>
      <div className="card" style={{marginBottom:12}}>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={4}
          placeholder={mode==="enc"?"<script>alert('xss')</script>":"&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"} />
        <button className="btn btn-primary" style={{marginTop:10,width:"100%"}} onClick={()=>addHistory("HTML Entity",text.slice(0,30),out)}>Run ↗</button>
      </div>
      <div className="card"><div className="card-title">Output</div><Output value={out} /></div>
    </div>
  );
}

// ─── Unicode Escapes ──────────────────────────────────────────────────────────
function UnicodeTab({ addHistory }) {
  const [text, setText] = useState(""); const [mode, setMode] = useState("dec");
  const out = text ? (mode==="enc" ? unicodeEscape(text) : unicodeDecode(text)) : "";
  return (
    <div>
      <div className="tabs-wrap">
        {["enc","dec"].map(m=><button key={m} className={`tab${mode===m?" active":""}`} onClick={()=>setMode(m)}>{m==="enc"?"Escape":"Unescape"}</button>)}
      </div>
      <div className="card" style={{marginBottom:12}}>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={4}
          placeholder={mode==="enc"?"Hello World €":"\\u0048\\u0065\\u006c\\u006c\\u006f"} style={{fontFamily:"monospace"}} />
        <button className="btn btn-primary" style={{marginTop:10,width:"100%"}} onClick={()=>addHistory("Unicode Escape",text.slice(0,30),out)}>Run ↗</button>
      </div>
      <div className="card"><div className="card-title">Output</div><Output value={out} mono={mode==="enc"} /></div>
      <div className="info-box" style={{marginTop:10}}>
        Supports: <code style={{color:"#93c5fd"}}>\\uXXXX</code>, <code style={{color:"#93c5fd"}}>\\UXXXXXXXX</code>, <code style={{color:"#93c5fd"}}>\\xXX</code>, <code style={{color:"#93c5fd"}}>\\n \\t \\r</code>
      </div>
    </div>
  );
}

// ─── Zero-Width Steg ──────────────────────────────────────────────────────────
function ZeroWidthTab({ addHistory }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);

  const run = () => {
    const r = detectZeroWidth(text);
    const ws = detectWhitespace(text);
    setResult({ zw: r, ws });
    addHistory("Steg Detect", text.slice(0,20), `${r.count} zero-width, ${ws.suspicious} suspicious lines`);
  };

  return (
    <div>
      <div className="card" style={{marginBottom:12}}>
        <label>Paste text to analyze (zero-width characters are invisible — copy from suspicious sources)</label>
        <textarea value={text} onChange={e=>{setText(e.target.value);setResult(null);}} rows={5}
          placeholder="Paste text here. Zero-width characters (U+200B, U+200D etc) are invisible but detectable." />
        <div style={{display:"flex",gap:8,marginTop:10}}>
          <button className="btn btn-primary" style={{flex:1}} onClick={run}>Analyze ↗</button>
          {text && <button className="btn btn-ghost" onClick={()=>setText(stripZeroWidth(text))}>Strip Zero-Width</button>}
        </div>
      </div>

      {result && (
        <>
          <div className="card" style={{marginBottom:12}}>
            <div className="card-title">Zero-Width Characters ({result.zw.count} found)</div>
            {result.zw.count === 0
              ? <div style={{color:"#64748b",fontSize:13}}>No zero-width characters detected.</div>
              : (
                <>
                  {result.zw.found.map((f,i)=>(
                    <div key={i} style={{display:"flex",gap:12,padding:"4px 0",fontSize:12,borderBottom:"1px solid #0f172a"}}>
                      <span style={{color:"#f87171",fontFamily:"monospace"}}>U+{f.hex.toUpperCase()}</span>
                      <span style={{color:"#94a3b8"}}>{f.name}</span>
                      <span style={{color:"#475569"}}>pos {f.position}</span>
                    </div>
                  ))}
                  {result.zw.binary && (
                    <div style={{marginTop:10}}>
                      <div style={{fontSize:11,color:"#475569",marginBottom:4}}>
                        Binary (ZWSP=0, ZWJ=1): {result.zw.binary}
                      </div>
                      {result.zw.decoded && (
                        <div style={{fontSize:12,color:"#86efac",fontFamily:"monospace"}}>
                          Decoded: {result.zw.decoded}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )
            }
          </div>

          <div className="card">
            <div className="card-title">Trailing Whitespace Analysis ({result.ws.suspicious} suspicious lines)</div>
            {result.ws.suspicious === 0
              ? <div style={{color:"#64748b",fontSize:13}}>No trailing whitespace steganography detected.</div>
              : (
                <>
                  <div style={{maxHeight:150,overflowY:"auto"}}>
                    {result.ws.lines.filter(l=>l.suspicious).map(l=>(
                      <div key={l.line} style={{display:"flex",gap:12,padding:"3px 0",fontSize:12}}>
                        <span style={{color:"#60a5fa",minWidth:50}}>Line {l.line}</span>
                        <span style={{color:"#fbbf24"}}>{l.trailingSpaces} trailing space{l.trailingSpaces!==1?"s":""}</span>
                        {l.tabs>0 && <span style={{color:"#a78bfa"}}>{l.tabs} tab{l.tabs!==1?"s":""}</span>}
                      </div>
                    ))}
                  </div>
                  {result.ws.decoded && (
                    <div style={{marginTop:8,fontSize:12,color:"#86efac",fontFamily:"monospace"}}>
                      Binary: {result.ws.binary} → Decoded: {result.ws.decoded}
                    </div>
                  )}
                </>
              )
            }
          </div>
        </>
      )}
    </div>
  );
}

// ─── JWT Secret Bruteforce ────────────────────────────────────────────────────
function JWTSecretTab({ addHistory }) {
  const [token, setToken] = useState("");
  const [custom, setCustom] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true); setResult(null);
    const wordlist = [...JWT_WORDLIST, ...custom.split("\n").map(s=>s.trim()).filter(Boolean)];
    const r = await bruteforceJWTSecret(token, wordlist);
    setResult(r);
    setLoading(false);
    const found = r.results?.find(x=>x.match);
    addHistory("JWT Secret Brute", token.slice(0,20)+"…", found ? `✅ Found: "${found.secret}"` : `❌ Not found (${r.tested} tested)`);
  };

  return (
    <div>
      <div className="card" style={{marginBottom:12}}>
        <div style={{marginBottom:10}}>
          <label>JWT token</label>
          <textarea value={token} onChange={e=>setToken(e.target.value)} rows={3}
            placeholder="eyJhbGci..." style={{fontFamily:"monospace",fontSize:11}} />
        </div>
        <div style={{marginBottom:10}}>
          <label>Additional secrets to try (one per line)</label>
          <textarea value={custom} onChange={e=>setCustom(e.target.value)} rows={3}
            placeholder={"mysecret\ncompanyname\n12345678"} />
        </div>
        <button className="btn btn-primary" style={{width:"100%"}} onClick={run} disabled={loading}>
          {loading ? `Testing ${JWT_WORDLIST.length + custom.split("\n").filter(Boolean).length} secrets…` : "Bruteforce ↗"}
        </button>
      </div>

      {result && (
        <div className="card">
          {result.error && <div style={{color:"#ef4444"}}>{result.error}</div>}
          {!result.error && (
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div className="card-title" style={{margin:0}}>Results</div>
                <span style={{fontSize:12,color:"#475569"}}>{result.tested} secrets tested</span>
              </div>
              {result.results?.length === 0 && (
                <div style={{color:"#64748b",fontSize:13}}>No match found in wordlist. Try adding custom secrets above.</div>
              )}
              {result.results?.map((r,i)=>(
                <div key={i} style={{
                  padding:"10px 12px",borderRadius:6,
                  background:r.match?"#14532d33":"#1e293b22",
                  border:`1px solid ${r.match?"#22c55e":"#1e293b"}`,
                  marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",
                }}>
                  <span style={{fontFamily:"monospace",fontSize:13,color:r.match?"#86efac":"#94a3b8",fontWeight:r.match?700:400}}>
                    {r.match ? "✅ " : ""}{r.secret}
                  </span>
                  {r.match && <CopyBtn text={r.secret} />}
                </div>
              ))}
            </>
          )}
        </div>
      )}
      <div className="info-box" style={{marginTop:10}}>
        Uses SubtleCrypto HMAC-SHA256 entirely client-side. Only tests HS256 tokens.
        For RS256/ES256, the secret is a private key — bruteforce is infeasible.
      </div>
    </div>
  );
}

// ─── URL Encode/Decode ────────────────────────────────────────────────────────
function URLTab({ addHistory }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("dec");
  const [error, setError] = useState("");

  const compute = (input, m) => {
    setError("");
    if (!input) return "";
    if (m === "enc") {
      try { return encodeURIComponent(input); } catch { return ""; }
    } else {
      try { return decodeURIComponent(input); }
      catch { setError("Invalid percent-encoded sequence — check your input."); return input; }
    }
  };

  const out = compute(text, mode);

  return (
    <div>
      <div className="tabs-wrap">
        {[["dec","Decode"],["enc","Encode"]].map(([m,label])=>(
          <button key={m} className={`tab${mode===m?" active":""}`} onClick={()=>setMode(m)}>{label}</button>
        ))}
      </div>
      <div className="card" style={{marginBottom:12}}>
        <label>{mode==="dec" ? "URL-encoded input (e.g. Hello%20World%21)" : "Plain text to encode"}</label>
        <textarea value={text} onChange={e=>setText(e.target.value)}
          placeholder={mode==="dec" ? "Hello%20World%21" : "Hello World!"}
          rows={3} />
        <button className="btn btn-primary" style={{marginTop:10,width:"100%"}}
          onClick={()=>addHistory("URL "+(mode==="dec"?"Decode":"Encode"), text.slice(0,30), out)}>
          Run ↗
        </button>
      </div>
      {error && <div className="info-box" style={{color:"var(--red)",marginBottom:8}}>{error}</div>}
      <div className="card">
        <div className="card-title">Output</div>
        <div className="morse-out">{out || <span style={{color:"#334155"}}>Output will appear here…</span>}</div>
        {out && !error && <CopyBtn text={out} />}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ModernEncodingView({ addHistory }) {
  const [tab, setTab] = useState("html");
  return (
    <div>
      <div className="section-header">
        <h3>Modern Encoding Tools</h3>
        <p>HTML entities, Unicode escapes, URL percent-encoding, zero-width steganography, and JWT secret bruteforce.</p>
      </div>
      <div className="tabs-wrap">
        {[["html","HTML Entities"],["unicode","Unicode Escapes"],["url","URL Encode/Decode"],["zwsteg","Zero-Width / Steg"],["jwtsecret","JWT Secret Brute"]].map(([id,label])=>(
          <button key={id} className={`tab${tab===id?" active":""}`} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>
      {tab==="html" && <HTMLTab addHistory={addHistory} />}
      {tab==="unicode" && <UnicodeTab addHistory={addHistory} />}
      {tab==="url" && <URLTab addHistory={addHistory} />}
      {tab==="zwsteg" && <ZeroWidthTab addHistory={addHistory} />}
      {tab==="jwtsecret" && <JWTSecretTab addHistory={addHistory} />}
    </div>
  );
}
