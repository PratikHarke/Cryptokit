import { useState } from "react";
import { affineEnc, affineDec, bfAffine, VALID_A } from "../crypto/classicalExtra.js";
import { beaufort } from "../crypto/classicalExtra.js";
import { baconEnc, baconDec } from "../crypto/classicalExtra.js";
import { playfairEnc, playfairDec, playfairGrid } from "../crypto/classicalExtra.js";
import Output from "../components/Output.jsx";

// ─── Affine ───────────────────────────────────────────────────────────────────
function AffineTab({ addHistory }) {
  const [text, setText] = useState("");
  const [a, setA] = useState(5); const [b, setB] = useState(8);
  const [mode, setMode] = useState("enc");
  const [bfResults, setBfResults] = useState(null);

  const out = text ? (mode==="enc" ? affineEnc(text,a,b) : affineDec(text,a,b)) : "";
  const run = () => addHistory(`Affine ${mode==="enc"?"Enc":"Dec"} (a=${a},b=${b})`, text.slice(0,30), out);

  return (
    <div>
      <div className="tabs-wrap">
        {["enc","dec","bf"].map(m => (
          <button key={m} className={`tab${mode===m?" active":""}`} onClick={()=>setMode(m)}>
            {m==="enc"?"Encrypt":m==="dec"?"Decrypt":"Bruteforce"}
          </button>
        ))}
      </div>
      <div className="card" style={{marginBottom:12}}>
        <div style={{marginBottom:10}}><label>Text</label><textarea value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="Enter text…" /></div>
        {mode !== "bf" && (
          <div className="row">
            <div>
              <label>a (coprime with 26)</label>
              <select value={a} onChange={e=>setA(Number(e.target.value))}>
                {VALID_A.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div><label>b (0–25)</label><input type="number" min={0} max={25} value={b} onChange={e=>setB(Number(e.target.value))} /></div>
            <div style={{display:"flex",alignItems:"flex-end"}}>
              <button className="btn btn-primary" style={{width:"100%"}} onClick={run}>Run ↗</button>
            </div>
          </div>
        )}
        {mode === "bf" && (
          <button className="btn btn-primary" style={{width:"100%"}} onClick={()=>setBfResults(bfAffine(text))}>
            Bruteforce All 312 Combinations ↗
          </button>
        )}
      </div>
      {mode !== "bf" && <div className="card"><div className="card-title">Output</div><Output value={out} /></div>}
      {mode === "bf" && bfResults && (
        <div className="card">
          <div className="card-title">Top candidates (sorted by English word score)</div>
          {bfResults.slice(0,15).map((r,i) => (
            <div key={i} style={{padding:"6px 0",borderBottom:"1px solid #0f172a",display:"flex",gap:12,fontSize:12}}>
              <span style={{color:"#93c5fd",fontWeight:600,minWidth:80}}>a={r.a}, b={r.b}</span>
              <span style={{fontFamily:"monospace",color:r.score>1?"#86efac":"#e2e8f0",flex:1,wordBreak:"break-all"}}>{r.text.slice(0,80)}</span>
              <span style={{color:"#475569",fontSize:11}}>score={r.score}</span>
            </div>
          ))}
        </div>
      )}
      <div className="info-box" style={{marginTop:12}}>
        <b style={{color:"#93c5fd"}}>Formula:</b> c = (a·m + b) mod 26 &nbsp;|&nbsp;
        Decrypt: m = a⁻¹·(c − b) mod 26 &nbsp;|&nbsp;
        312 total key combinations (12 valid a values × 26 b values)
      </div>
    </div>
  );
}

// ─── Beaufort ─────────────────────────────────────────────────────────────────
function BeaufortTab({ addHistory }) {
  const [text, setText] = useState("");
  const [key, setKey] = useState("KEY");
  const out = text && key ? beaufort(text, key) : "";
  return (
    <div>
      <div className="card" style={{marginBottom:12}}>
        <div style={{marginBottom:10}}><label>Text (same operation encrypts and decrypts)</label><textarea value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="Enter text…" /></div>
        <div className="row">
          <div><label>Key</label><input value={key} onChange={e=>setKey(e.target.value)} /></div>
          <div style={{display:"flex",alignItems:"flex-end"}}>
            <button className="btn btn-primary" style={{width:"100%"}} onClick={()=>addHistory("Beaufort",text.slice(0,30),out)}>Run ↗</button>
          </div>
        </div>
      </div>
      <div className="card"><div className="card-title">Output (apply again to decrypt)</div><Output value={out} /></div>
      <div className="info-box" style={{marginTop:12}}>
        <b style={{color:"#93c5fd"}}>Beaufort vs Vigenère:</b> Vigenère: c = (m + k) mod 26. Beaufort: c = (k − m) mod 26. Self-reciprocal — the same operation decrypts.
      </div>
    </div>
  );
}

// ─── Bacon ────────────────────────────────────────────────────────────────────
function BaconTab({ addHistory }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("enc");
  const out = text ? (mode==="enc" ? baconEnc(text) : baconDec(text)) : "";
  return (
    <div>
      <div className="tabs-wrap">
        {["enc","dec"].map(m=>(
          <button key={m} className={`tab${mode===m?" active":""}`} onClick={()=>setMode(m)}>
            {m==="enc"?"Encode":"Decode"}
          </button>
        ))}
      </div>
      <div className="card" style={{marginBottom:12}}>
        <label>{mode==="enc"?"Text to encode":"A/B binary to decode"}</label>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={3}
          placeholder={mode==="enc"?"Hello world…":"AABBB AABAB ABABB ABABB ABBBA"}
          style={{fontFamily:"monospace"}} />
        <button className="btn btn-primary" style={{marginTop:10,width:"100%"}} onClick={()=>addHistory("Bacon",text.slice(0,30),out)}>Run ↗</button>
      </div>
      <div className="card">
        <div className="card-title">Output</div>
        <div style={{background:"#070b16",border:"1px solid #1e293b",borderRadius:6,padding:"10px 12px",fontFamily:"monospace",fontSize:13,color:"#fbbf24",wordBreak:"break-all",whiteSpace:"pre-wrap"}}>
          {out || <span style={{color:"#334155"}}>Output will appear here…</span>}
        </div>
      </div>
      <div className="info-box" style={{marginTop:12}}>
        <b style={{color:"#93c5fd"}}>26-letter Bacon:</b> A=AAAAA, B=AAAAB, …, Z=BBBBB. Also accepts 0/1 instead of A/B.
        Often hidden in text by alternating fonts (bold=B, normal=A).
      </div>
    </div>
  );
}

// ─── Playfair ─────────────────────────────────────────────────────────────────
function PlayfairTab({ addHistory }) {
  const [text, setText] = useState("");
  const [key, setKey] = useState("PLAYFAIR");
  const [mode, setMode] = useState("enc");
  const out = text && key ? (mode==="enc" ? playfairEnc(text,key) : playfairDec(text,key)) : "";
  const grid = key ? playfairGrid(key) : [];

  return (
    <div>
      <div className="tabs-wrap">
        {["enc","dec"].map(m=>(
          <button key={m} className={`tab${mode===m?" active":""}`} onClick={()=>setMode(m)}>
            {m==="enc"?"Encrypt":"Decrypt"}
          </button>
        ))}
      </div>
      <div className="card" style={{marginBottom:12}}>
        <div style={{marginBottom:10}}><label>Text (J treated as I)</label><textarea value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="Enter text…" /></div>
        <div className="row">
          <div><label>Key</label><input value={key} onChange={e=>setKey(e.target.value.toUpperCase())} /></div>
          <div style={{display:"flex",alignItems:"flex-end"}}>
            <button className="btn btn-primary" style={{width:"100%"}} onClick={()=>addHistory(`Playfair ${mode==="enc"?"Enc":"Dec"}`,text.slice(0,30),out)}>Run ↗</button>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div className="card">
          <div className="card-title">5×5 Key Square</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4}}>
            {grid.map((ch,i)=>(
              <div key={i} style={{
                background:"#1e293b",borderRadius:4,padding:"6px 0",
                textAlign:"center",fontFamily:"monospace",fontSize:14,
                fontWeight:700,color:"#93c5fd",
              }}>{ch}</div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Output</div>
          <Output value={out} />
        </div>
      </div>

      <div className="info-box">
        <b style={{color:"#93c5fd"}}>Playfair rules:</b> Fill 5×5 grid with key then remaining letters (I=J).
        Digraph substitution: same row→shift right, same col→shift down, otherwise→rectangle swap.
        Repeating letters in a pair are separated by X.
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────
export default function ClassicalExtraView({ addHistory }) {
  const [tab, setTab] = useState("affine");
  return (
    <div>
      <div className="section-header">
        <h3>More Classical Ciphers</h3>
        <p>Affine, Beaufort, Bacon, and Playfair — common CTF ciphers not covered by the basic tools.</p>
      </div>
      <div className="tabs-wrap">
        {[["affine","Affine"],["beaufort","Beaufort"],["bacon","Bacon"],["playfair","Playfair"]].map(([id,label])=>(
          <button key={id} className={`tab${tab===id?" active":""}`} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>
      {tab==="affine" && <AffineTab addHistory={addHistory} />}
      {tab==="beaufort" && <BeaufortTab addHistory={addHistory} />}
      {tab==="bacon" && <BaconTab addHistory={addHistory} />}
      {tab==="playfair" && <PlayfairTab addHistory={addHistory} />}
    </div>
  );
}
