import { useState, useRef } from "react";
import { identifyHash }         from "../crypto/hash.js";
import {
  parseArgon2Hash,
  generateArgon2Hash,
  verifyArgon2Password,
  crackArgon2Dictionary,
} from "../crypto/argon2.js";
import { CopyBtn } from "../components/Output.jsx";

// ── Shared hash functions ─────────────────────────────────────────────────────
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}
async function sha1(str) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}
async function sha512(str) {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}
function md5(str) {
  function safeAdd(x,y){const l=(x&0xFFFF)+(y&0xFFFF);return(((x>>16)+(y>>16)+(l>>16))<<16)|(l&0xFFFF);}
  function rotL(n,c){return(n<<c)|(n>>>(32-c));}
  function cmn(q,a,b,x,s,t){return safeAdd(rotL(safeAdd(safeAdd(a,q),safeAdd(x,t)),s),b);}
  function ff(a,b,c,d,x,s,t){return cmn((b&c)|((~b)&d),a,b,x,s,t);}
  function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&(~d)),a,b,x,s,t);}
  function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t);}
  function ii(a,b,c,d,x,s,t){return cmn(c^(b|(~d)),a,b,x,s,t);}
  const rawBytes=new TextEncoder().encode(str);
  const bytes=String.fromCharCode(...rawBytes);
  const x=[];
  for(let i=0;i<bytes.length;i++)x[i>>2]|=bytes.charCodeAt(i)<<((i%4)*8);
  x[bytes.length>>2]|=0x80<<((bytes.length%4)*8);
  x[(((bytes.length+8)>>6)+1)*16-2]=bytes.length*8;
  let[a,b,c,d]=[1732584193,-271733879,-1732584194,271733878];
  for(let i=0;i<x.length;i+=16){
    const[oa,ob,oc,od]=[a,b,c,d];
    a=ff(a,b,c,d,x[i],7,-680876936);d=ff(d,a,b,c,x[i+1],12,-389564586);c=ff(c,d,a,b,x[i+2],17,606105819);b=ff(b,c,d,a,x[i+3],22,-1044525330);
    a=ff(a,b,c,d,x[i+4],7,-176418897);d=ff(d,a,b,c,x[i+5],12,1200080426);c=ff(c,d,a,b,x[i+6],17,-1473231341);b=ff(b,c,d,a,x[i+7],22,-45705983);
    a=ff(a,b,c,d,x[i+8],7,1770035416);d=ff(d,a,b,c,x[i+9],12,-1958414417);c=ff(c,d,a,b,x[i+10],17,-42063);b=ff(b,c,d,a,x[i+11],22,-1990404162);
    a=ff(a,b,c,d,x[i+12],7,1804603682);d=ff(d,a,b,c,x[i+13],12,-40341101);c=ff(c,d,a,b,x[i+14],17,-1502002290);b=ff(b,c,d,a,x[i+15],22,1236535329);
    a=gg(a,b,c,d,x[i+1],5,-165796510);d=gg(d,a,b,c,x[i+6],9,-1069501632);c=gg(c,d,a,b,x[i+11],14,643717713);b=gg(b,c,d,a,x[i],20,-373897302);
    a=gg(a,b,c,d,x[i+5],5,-701558691);d=gg(d,a,b,c,x[i+10],9,38016083);c=gg(c,d,a,b,x[i+15],14,-660478335);b=gg(b,c,d,a,x[i+4],20,-405537848);
    a=gg(a,b,c,d,x[i+9],5,568446438);d=gg(d,a,b,c,x[i+14],9,-1019803690);c=gg(c,d,a,b,x[i+3],14,-187363961);b=gg(b,c,d,a,x[i+8],20,1163531501);
    a=gg(a,b,c,d,x[i+13],5,-1444681467);d=gg(d,a,b,c,x[i+2],9,-51403784);c=gg(c,d,a,b,x[i+7],14,1735328473);b=gg(b,c,d,a,x[i+12],20,-1926607734);
    a=hh(a,b,c,d,x[i+5],4,-378558);d=hh(d,a,b,c,x[i+8],11,-2022574463);c=hh(c,d,a,b,x[i+11],16,1839030562);b=hh(b,c,d,a,x[i+14],23,-35309556);
    a=hh(a,b,c,d,x[i+1],4,-1530992060);d=hh(d,a,b,c,x[i+4],11,1272893353);c=hh(c,d,a,b,x[i+7],16,-155497632);b=hh(b,c,d,a,x[i+10],23,-1094730640);
    a=hh(a,b,c,d,x[i+13],4,681279174);d=hh(d,a,b,c,x[i],11,-358537222);c=hh(c,d,a,b,x[i+3],16,-722521979);b=hh(b,c,d,a,x[i+6],23,76029189);
    a=hh(a,b,c,d,x[i+9],4,-640364487);d=hh(d,a,b,c,x[i+12],11,-421815835);c=hh(c,d,a,b,x[i+15],16,530742520);b=hh(b,c,d,a,x[i+2],23,-995338651);
    a=ii(a,b,c,d,x[i],6,-198630844);d=ii(d,a,b,c,x[i+7],10,1126891415);c=ii(c,d,a,b,x[i+14],15,-1416354905);b=ii(b,c,d,a,x[i+5],21,-57434055);
    a=ii(a,b,c,d,x[i+12],6,1700485571);d=ii(d,a,b,c,x[i+3],10,-1894986606);c=ii(c,d,a,b,x[i+10],15,-1051523);b=ii(b,c,d,a,x[i+1],21,-2054922799);
    a=ii(a,b,c,d,x[i+8],6,1873313359);d=ii(d,a,b,c,x[i+15],10,-30611744);c=ii(c,d,a,b,x[i+6],15,-1560198380);b=ii(b,c,d,a,x[i+13],21,1309151649);
    a=ii(a,b,c,d,x[i+4],6,-145523070);d=ii(d,a,b,c,x[i+11],10,-1120210379);c=ii(c,d,a,b,x[i+2],15,718787259);b=ii(b,c,d,a,x[i+9],21,-343485551);
    a=safeAdd(a,oa);b=safeAdd(b,ob);c=safeAdd(c,oc);d=safeAdd(d,od);
  }
  return[a,b,c,d].map(n=>{let s="";for(let i=0;i<4;i++)s+=("0"+((n>>>(i*8))&0xFF).toString(16)).slice(-2);return s;}).join("");
}

const WORDLIST = [
  "password","password123","123456","qwerty","letmein","welcome","admin","root",
  "flag","secret","monkey","dragon","master","abc123","pass","login","test",
  "hello","world","sunshine","princess","shadow","superman","michael","football",
  "baseball","soccer","hockey","batman","trustno1","iloveyou","computer","hunter",
  "freedom","whatever","rockyou","passw0rd","p@ssword","p@ssw0rd","pa$$word",
  "flag{test}","flag{admin}","flag{secret}","crypto","cipher","hash","ctf",
  "challenge","solve","attack","summer2023","winter2024","correcthorse",
  "abc","abcdef","654321","111111","000000","12345","1234","0000",
];

const CONF_STYLE = {
  "Very High":{ bg:"#14532d44", col:"var(--green)" },
  "High":     { bg:"#1e3a5f44", col:"var(--accent)" },
  "Medium":   { bg:"#78350f44", col:"#fde68a" },
  "Low":      { bg:"#1e1b4b44", col:"#a5b4fc" },
  "None":     { bg:"var(--bg-hover)", col:"var(--text-2)" },
};

// ── Identify tab ──────────────────────────────────────────────────────────────
function IdentifyTab({ addHistory }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);

  const examples = [
    "5f4dcc3b5aa765d61d8327deb882cf99",
    "da39a3ee5e6b4b0d3255bfef95601890afd80709",
    "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",
    "$argon2id$v=19$m=65536,t=3,p=1$abc$hashhere",
  ];

  const run = () => {
    if (!text.trim()) return;
    const r = identifyHash(text.trim());
    setResults(r);
    addHistory?.("Hash Identify", text.slice(0,24), r.map(x=>x.type).join(", "));
  };

  return (
    <div>
      <p style={{ fontSize:12, color:"var(--text-2)", marginBottom:12 }}>
        Identifies 40+ hash types by length, prefix, and format. Never says "decrypt" — hashes are one-way.
      </p>
      <div className="card" style={{ marginBottom:12 }}>
        <label>Hash string</label>
        <textarea rows={2} value={text} onChange={e => setText(e.target.value)}
          placeholder="Paste any hash here…" style={{ fontFamily:"monospace" }} />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
          {examples.map((ex,i) => (
            <button key={i} className="btn btn-ghost btn-sm"
              onClick={() => { setText(ex); setResults(identifyHash(ex)); }}>
              Example {i+1}
            </button>
          ))}
          <button className="btn btn-primary" style={{ marginLeft:"auto" }} onClick={run}>
            Identify Hash
          </button>
        </div>
      </div>
      {results.length > 0 && results.map((r, i) => {
        const cs = CONF_STYLE[r.confidence] ?? CONF_STYLE.None;
        return (
          <div key={i} className="card" style={{ marginBottom:8, borderLeft:`3px solid ${cs.col}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:700, color:"var(--text-1)" }}>{r.type}</span>
              <span style={{ fontSize:11, color:cs.col, fontWeight:700,
                background:cs.bg, padding:"2px 8px", borderRadius:4 }}>{r.confidence}</span>
            </div>
            {r.note && <div style={{ fontSize:11, color:"var(--text-2)", marginTop:4 }}>{r.note}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── Generate tab ──────────────────────────────────────────────────────────────
function GenerateTab({ addHistory }) {
  const [word, setWord]   = useState("");
  const [hashes, setHashes] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!word) return;
    setLoading(true);
    const [m, s1, s256, s512] = await Promise.all([
      Promise.resolve(md5(word)),
      sha1(word), sha256(word), sha512(word),
    ]);
    setHashes({ md5: m, sha1: s1, sha256: s256, sha512: s512 });
    addHistory?.("Hash Generate", word, `MD5:${m.slice(0,8)}… SHA256:${s256.slice(0,8)}…`);
    setLoading(false);
  };

  return (
    <div>
      <p style={{ fontSize:12, color:"var(--text-2)", marginBottom:12 }}>
        Generate MD5, SHA-1, SHA-256, and SHA-512 digests. Useful for CTF verification and testing.
      </p>
      <div className="card" style={{ marginBottom:12 }}>
        <label>Input text</label>
        <input value={word} onChange={e => setWord(e.target.value)} placeholder="Enter text to hash…" />
        <button className="btn btn-primary" style={{ marginTop:8 }} onClick={run} disabled={loading || !word}>
          {loading ? "⏳ Hashing…" : "Generate Hashes"}
        </button>
      </div>
      {hashes && Object.entries(hashes).map(([algo, hash]) => (
        <div key={algo} className="card" style={{ marginBottom:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:11, color:"var(--text-3)", textTransform:"uppercase",
              letterSpacing:1 }}>{algo}</span>
            <CopyBtn text={hash} />
          </div>
          <code style={{ fontSize:11, color:"var(--accent)", wordBreak:"break-all",
            fontFamily:"var(--font-mono)" }}>{hash}</code>
        </div>
      ))}
    </div>
  );
}

// ── Verify tab ────────────────────────────────────────────────────────────────
function VerifyTab({ addHistory }) {
  const [hash, setHash]   = useState("");
  const [word, setWord]   = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    const t = hash.trim().toLowerCase();
    let candidate = null;
    if      (t.length === 32) candidate = md5(word) === t ? "MD5"     : null;
    else if (t.length === 40) candidate = (await sha1(word))   === t ? "SHA-1"   : null;
    else if (t.length === 64) candidate = (await sha256(word)) === t ? "SHA-256" : null;
    else if (t.length === 128)candidate = (await sha512(word)) === t ? "SHA-512" : null;
    setResult(candidate !== null ? { match:true, algo:candidate } : { match:false });
    addHistory?.("Hash Verify", `"${word}" vs ${t.slice(0,12)}…`, candidate ? "MATCH" : "NO MATCH");
    setLoading(false);
  };

  return (
    <div>
      <p style={{ fontSize:12, color:"var(--text-2)", marginBottom:12 }}>
        Verify a candidate plaintext against a known MD5 / SHA-1 / SHA-256 / SHA-512 hash.
        For Argon2 and bcrypt, use the Advanced Hashes tab.
      </p>
      <div className="card" style={{ marginBottom:12 }}>
        <label>Hash (hex)</label>
        <input value={hash} onChange={e => setHash(e.target.value)}
          placeholder="5f4dcc3b5aa765d61d8327deb882cf99" style={{ fontFamily:"monospace" }} />
        <label style={{ marginTop:8 }}>Candidate plaintext</label>
        <input value={word} onChange={e => setWord(e.target.value)} placeholder="password" />
        <button className="btn btn-primary" style={{ marginTop:8 }} onClick={run}
          disabled={loading || !hash || !word}>
          {loading ? "⏳ Verifying…" : "Verify"}
        </button>
      </div>
      {result && (
        result.match
          ? <div style={{ background:"#14532d22", border:"1px solid #22c55e55", borderRadius:6,
              padding:12, color:"#86efac", fontSize:13 }}>
              ✅ Hash matches! Algorithm: <strong>{result.algo}</strong>
            </div>
          : <div style={{ background:"#7f1d1d22", border:"1px solid #ef444455", borderRadius:6,
              padding:12, color:"#f87171", fontSize:13 }}>
              ❌ Hash does not match this candidate.
            </div>
      )}
    </div>
  );
}

// ── Dictionary Attack tab ─────────────────────────────────────────────────────
function DictionaryTab({ addHistory }) {
  const [hash, setHash]       = useState("");
  const [custom, setCustom]   = useState("");
  const [status, setStatus]   = useState(null);
  const [running, setRunning] = useState(false);
  const abortRef = useRef(false);

  const detectType = (t) => {
    t = t.trim().toLowerCase();
    if (t.startsWith("$2")) return "bcrypt";
    if (t.startsWith("$argon2")) return "argon2";
    if (t.length === 32) return "md5";
    if (t.length === 40) return "sha1";
    if (t.length === 64) return "sha256";
    if (t.length === 128) return "sha512";
    return null;
  };

  const run = async () => {
    const t = hash.trim();
    const type = detectType(t);
    if (!type) { setStatus({ state:"error", msg:"Unrecognised hash format" }); return; }
    if (type === "bcrypt" || type === "argon2") {
      setStatus({ state:"external", type: type === "bcrypt" ? "bcrypt" : "Argon2",
        why:"These are slow-by-design KDFs — use the Advanced Hashes tab for Argon2, or hashcat for bcrypt.",
        tool: type === "bcrypt" ? "hashcat -m 3200 hash.txt wordlist.txt" : "Use the Advanced Hashes tab →" });
      return;
    }
    const words = [...WORDLIST, ...custom.split(/\r?\n/).map(w=>w.trim()).filter(Boolean)];
    abortRef.current = false;
    setRunning(true);
    setStatus({ state:"running", tried:0 });
    const t0 = Date.now();
    for (let i = 0; i < words.length; i++) {
      if (abortRef.current) { setStatus({ state:"stopped", tried:i }); setRunning(false); return; }
      let h;
      if      (type === "md5")    h = md5(words[i]);
      else if (type === "sha1")   h = await sha1(words[i]);
      else if (type === "sha256") h = await sha256(words[i]);
      else if (type === "sha512") h = await sha512(words[i]);
      if (h === t.toLowerCase()) {
        const ms = Date.now()-t0;
        setStatus({ state:"cracked", word:words[i], type:type.toUpperCase(),
          tried:i+1, ms, speed: Math.round((i+1)/(ms/1000)) });
        addHistory?.("Dictionary Attack", t.slice(0,20), `Cracked: "${words[i]}"`);
        setRunning(false); return;
      }
      if (i % 50 === 0) { setStatus(s => ({...s, tried:i})); await new Promise(r=>setTimeout(r,0)); }
    }
    const ms = Date.now()-t0;
    setStatus({ state:"failed", tried:words.length, ms, speed: Math.round(words.length/(ms/1000)||0) });
    setRunning(false);
  };

  const speed = status?.speed;

  return (
    <div>
      <p style={{ fontSize:12, color:"var(--text-2)", marginBottom:12 }}>
        Attempt to find a plaintext candidate for MD5, SHA-1, SHA-256, and SHA-512 hashes.
        This is a <em>dictionary attack</em> — not decryption. Hashes are one-way functions.
      </p>
      <div className="card" style={{ marginBottom:12 }}>
        <label>Hash to identify candidate for</label>
        <input value={hash} onChange={e => setHash(e.target.value)}
          placeholder="Paste MD5, SHA-1, SHA-256, or SHA-512 hash…" style={{ fontFamily:"monospace" }} />
        <label style={{ marginTop:8 }}>Custom wordlist (one word per line, added to built-in)</label>
        <textarea rows={4} value={custom} onChange={e => setCustom(e.target.value)}
          placeholder={"password123\ndragon\nletmein"} style={{ fontFamily:"monospace", fontSize:12 }} />
        <div style={{ display:"flex", gap:8, marginTop:8 }}>
          <button className="btn btn-primary" onClick={run} disabled={running || !hash}>
            {running ? `⏳ Trying (${status?.tried??0})…` : "Start Dictionary Attack"}
          </button>
          {running && (
            <button className="btn btn-ghost" onClick={() => { abortRef.current = true; }}>
              ■ Stop
            </button>
          )}
        </div>
      </div>
      {status?.state === "cracked" && (
        <div style={{ background:"#14532d22", border:"1px solid #22c55e55", borderRadius:6, padding:12 }}>
          <div style={{ color:"#86efac", fontWeight:700, fontSize:14, marginBottom:8 }}>🎉 Candidate found!</div>
          {[["Plaintext", status.word],["Type", status.type],["Tried", status.tried.toLocaleString()],
            ["Time", status.ms+"ms"],["Speed", speed?.toLocaleString()+" h/s"]].map(([k,v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:12,
              borderTop:"1px solid #22c55e22", padding:"4px 0" }}>
              <span style={{ color:"#94a3b8" }}>{k}</span>
              <span style={{ color:"#f1f5f9", fontFamily:"monospace" }}>{v}</span>
            </div>
          ))}
        </div>
      )}
      {status?.state === "failed" && (
        <div style={{ background:"#7f1d1d22", border:"1px solid #ef444455", borderRadius:6, padding:12,
          color:"#f87171", fontSize:13 }}>
          ❌ Not found in {status.tried} candidates. Add more words or use hashcat with rockyou.txt.
        </div>
      )}
      {status?.state === "external" && (
        <div style={{ background:"#1e1a0e", border:"1px solid #a16207", borderRadius:6, padding:12 }}>
          <div style={{ color:"#fbbf24", fontWeight:700, marginBottom:6 }}>🔒 {status.type} — Cannot crack here</div>
          <div style={{ fontSize:12, color:"#94a3b8", marginBottom:8 }}>{status.why}</div>
          <code style={{ fontSize:11, color:"#ffd700", wordBreak:"break-all" }}>{status.tool}</code>
        </div>
      )}
      {status?.state === "error" && (
        <div style={{ background:"#7f1d1d22", border:"1px solid #ef444455", borderRadius:6, padding:12,
          color:"#f87171" }}>❌ {status.msg}</div>
      )}
    </div>
  );
}

// ── Advanced Hashes (Argon2) tab ──────────────────────────────────────────────
function AdvancedTab({ addHistory }) {
  const [subTab, setSubTab] = useState("generate");
  // Generate state
  const [genPw, setGenPw]     = useState("");
  const [genVar, setGenVar]   = useState("argon2id");
  const [genRes, setGenRes]   = useState(null);
  const [genLoading, setGL]   = useState(false);
  // Verify state
  const [verHash, setVerHash] = useState("");
  const [verPw, setVerPw]     = useState("");
  const [verRes, setVerRes]   = useState(null);
  const [verLoading, setVL]   = useState(false);
  // Parse state
  const [parseIn, setParseIn] = useState("");
  const [parseRes, setParseRes] = useState(null);
  // Dictionary state
  const [dictHash, setDictHash] = useState("");
  const [dictWords, setDictWords] = useState("admin\npassword\nletmein\ndragon123\nqwerty");
  const [dictRes, setDictRes] = useState(null);
  const [dictRunning, setDR] = useState(false);
  const [dictProg, setDP]   = useState(null);

  const doGenerate = async () => {
    setGL(true); setGenRes(null);
    const r = await generateArgon2Hash(genPw, { variant: genVar, m:4096, t:2, p:1 });
    setGenRes(r);
    addHistory?.("Argon2 Generate", genPw, r.encoded ?? r.error);
    setGL(false);
  };
  const doVerify = async () => {
    setVL(true); setVerRes(null);
    const r = await verifyArgon2Password(verPw, verHash);
    setVerRes(r);
    addHistory?.("Argon2 Verify", verPw, r.match ? "MATCH" : r.error ?? "NO MATCH");
    setVL(false);
  };
  const doParse = () => {
    setParseRes(parseArgon2Hash(parseIn));
  };
  const doDictionary = async () => {
    const words = dictWords.split(/\r?\n/).map(w=>w.trim()).filter(Boolean);
    if (!dictHash || !words.length) return;
    setDR(true); setDictRes(null); setDP({ tried:0, total:words.length, current:"" });
    const r = await crackArgon2Dictionary(dictHash, words, {
      onProgress:(tried,total,current) => setDP({tried,total,current}),
    });
    setDictRes(r); setDR(false); setDP(null);
    addHistory?.("Argon2 Dictionary", dictHash.slice(0,20), r.found ? `Found: ${r.password}` : "Not found");
  };

  return (
    <div>
      <p style={{ fontSize:12, color:"var(--text-2)", marginBottom:12 }}>
        Argon2 (argon2id / argon2i / argon2d) — memory-hard KDF. Cannot be reversed. Verification re-runs
        the hash with the stored salt and compares.
      </p>
      <div className="tabs-wrap" style={{ marginBottom:12 }}>
        {[["generate","Generate"],["verify","Verify"],["parse","Parse PHC"],["dictionary","Dictionary"]].map(([id,l]) => (
          <button key={id} className={`tab${subTab===id?" active":""}`} onClick={() => setSubTab(id)}>{l}</button>
        ))}
      </div>

      {subTab === "generate" && (
        <div className="card">
          <label>Password</label>
          <input value={genPw} onChange={e => setGenPw(e.target.value)} placeholder="Plaintext password" />
          <label style={{ marginTop:8 }}>Variant</label>
          <select value={genVar} onChange={e => setGenVar(e.target.value)}>
            <option value="argon2id">argon2id (recommended)</option>
            <option value="argon2i">argon2i</option>
            <option value="argon2d">argon2d</option>
          </select>
          <button className="btn btn-primary" style={{ marginTop:8 }} onClick={doGenerate}
            disabled={genLoading || !genPw}>
            {genLoading ? "⏳ Hashing…" : "Generate Argon2 Hash"}
          </button>
          {genRes?.error && <div style={{ color:"#f87171", marginTop:8, fontSize:12 }}>❌ {genRes.error}</div>}
          {genRes?.encoded && (
            <div style={{ marginTop:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:11, color:"var(--text-3)" }}>PHC String:</span>
                <CopyBtn text={genRes.encoded} />
              </div>
              <code style={{ fontSize:11, wordBreak:"break-all", color:"#86efac",
                fontFamily:"var(--font-mono)" }}>{genRes.encoded}</code>
            </div>
          )}
        </div>
      )}

      {subTab === "verify" && (
        <div className="card">
          <label>Argon2 PHC string</label>
          <textarea rows={2} value={verHash} onChange={e => setVerHash(e.target.value)}
            placeholder="$argon2id$v=19$m=…" style={{ fontFamily:"monospace", fontSize:11 }} />
          <label style={{ marginTop:8 }}>Candidate password</label>
          <input value={verPw} onChange={e => setVerPw(e.target.value)} placeholder="Enter password to verify" />
          <button className="btn btn-primary" style={{ marginTop:8 }} onClick={doVerify}
            disabled={verLoading || !verHash || !verPw}>
            {verLoading ? "⏳ Verifying…" : "Verify Password"}
          </button>
          {verRes && (
            verRes.error
              ? <div style={{ color:"#f87171", marginTop:8, fontSize:12 }}>❌ {verRes.error}</div>
              : verRes.match
                ? <div style={{ color:"#86efac", marginTop:8, fontWeight:700 }}>✅ Password matches!</div>
                : <div style={{ color:"#f87171", marginTop:8 }}>❌ Password does not match.</div>
          )}
        </div>
      )}

      {subTab === "parse" && (
        <div className="card">
          <label>Argon2 PHC string</label>
          <textarea rows={2} value={parseIn} onChange={e => setParseIn(e.target.value)}
            placeholder="$argon2id$v=19$m=65536,t=3,p=1$salt$hash"
            style={{ fontFamily:"monospace", fontSize:11 }} />
          <button className="btn btn-primary" style={{ marginTop:8 }} onClick={doParse}>Parse</button>
          {parseRes && (
            parseRes.error
              ? <div style={{ color:"#f87171", marginTop:8, fontSize:12 }}>❌ {parseRes.error}</div>
              : <div style={{ marginTop:10 }}>
                  {[["Variant",parseRes.variant],["Version",parseRes.version],
                    ["Memory (KiB)",parseRes.m?.toLocaleString()],["Iterations",parseRes.t],
                    ["Parallelism",parseRes.p],["Salt (b64)",parseRes.salt],["Hash (b64)",parseRes.hash]
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:"flex", gap:8, fontSize:12, padding:"3px 0",
                      borderBottom:"1px solid var(--border-sub)" }}>
                      <span style={{ color:"var(--text-3)", minWidth:120 }}>{k}</span>
                      <span style={{ color:"var(--text-1)", fontFamily:"monospace",
                        wordBreak:"break-all" }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
          )}
        </div>
      )}

      {subTab === "dictionary" && (
        <div className="card">
          <label>Argon2 PHC string</label>
          <textarea rows={2} value={dictHash} onChange={e => setDictHash(e.target.value)}
            placeholder="$argon2id$v=19$…" style={{ fontFamily:"monospace", fontSize:11 }} />
          <label style={{ marginTop:8 }}>Wordlist (one per line)</label>
          <textarea rows={5} value={dictWords} onChange={e => setDictWords(e.target.value)}
            style={{ fontFamily:"monospace", fontSize:12 }} />
          <button className="btn btn-primary" style={{ marginTop:8 }} onClick={doDictionary}
            disabled={dictRunning || !dictHash || !dictWords}>
            {dictRunning ? "⏳ Attacking…" : "Start Dictionary Attack"}
          </button>
          {dictProg && (
            <div style={{ marginTop:8 }}>
              <div style={{ fontSize:11, color:"var(--text-2)", marginBottom:4 }}>
                Trying: <code>{dictProg.current}</code> ({dictProg.tried}/{dictProg.total})
              </div>
              <div style={{ background:"var(--bg-hover)", borderRadius:3, height:4, overflow:"hidden" }}>
                <div style={{ width:`${(dictProg.tried/dictProg.total)*100}%`, height:"100%",
                  background:"var(--accent)" }} />
              </div>
            </div>
          )}
          {dictRes && (
            dictRes.error
              ? <div style={{ color:"#f87171", marginTop:8, fontSize:12 }}>❌ {dictRes.error}</div>
              : dictRes.found
                ? <div style={{ color:"#86efac", marginTop:8, fontWeight:700 }}>
                    ✅ Found: <code style={{ fontSize:14 }}>{dictRes.password}</code>
                    <span style={{ fontSize:11, color:"var(--text-3)", marginLeft:8 }}>
                      after {dictRes.tried} attempts
                    </span>
                  </div>
                : <div style={{ color:"#f87171", marginTop:8, fontSize:13 }}>
                    ❌ Not found in {dictRes.tried} candidates.
                  </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function HashAnalyzerView({ addHistory }) {
  const [tab, setTab] = useState("identify");

  return (
    <div>
      <div className="section-header">
        <h3># Hash Analyzer</h3>
        <p>Identify, generate, verify, and run dictionary attacks against 40+ hash and KDF formats.</p>
      </div>
      <div style={{ background:"#1e1a0e", border:"1px solid #a16207", borderRadius:6,
        padding:"8px 14px", marginBottom:14, fontSize:11, color:"#fbbf24" }}>
        ⚠️ Hashes are <strong>one-way functions</strong> — they cannot be decrypted. This tool can
        only <em>identify</em>, <em>verify</em>, or attempt a <em>dictionary attack</em> (candidate search).
      </div>
      <div className="tabs-wrap">
        {[
          ["identify",  "🔎 Identify"],
          ["generate",  "⚙ Generate"],
          ["verify",    "✅ Verify"],
          ["dictionary","💥 Dictionary Attack"],
          ["advanced",  "🔐 Advanced (Argon2)"],
        ].map(([id, label]) => (
          <button key={id} className={`tab${tab===id?" active":""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === "identify"   && <IdentifyTab   addHistory={addHistory} />}
      {tab === "generate"   && <GenerateTab   addHistory={addHistory} />}
      {tab === "verify"     && <VerifyTab     addHistory={addHistory} />}
      {tab === "dictionary" && <DictionaryTab addHistory={addHistory} />}
      {tab === "advanced"   && <AdvancedTab   addHistory={addHistory} />}
    </div>
  );
}
