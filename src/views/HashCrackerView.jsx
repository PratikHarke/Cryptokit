import { useState, useRef } from "react";

// Common wordlist for CTF-style hash cracking
const WORDLIST = [
  "password","password123","123456","qwerty","letmein","welcome","admin","root",
  "flag","secret","monkey","dragon","master","abc123","pass","login","test",
  "hello","world","sunshine","princess","shadow","superman","michael","football",
  "baseball","soccer","hockey","batman","trustno1","iloveyou","computer","hunter",
  "freedom","whatever","rockyou","passw0rd","p@ssword","p@ssw0rd","pa$$word",
  "flag{test}","flag{admin}","flag{secret}","flag{password}","flag{cracked}",
  // common CTF flags
  "crypto","cipher","hash","md5","sha1","sha256","broken","cracked","hacked",
  "ctf","challenge","solve","attack","brute","force","rainbow","table",
  "abc","abcdef","654321","111111","000000","999999","12345","1234","0000",
  "pass1","pass2","admin1","admin2","root123","toor","kali","parrot","linux",
  "summer2023","winter2024","spring2023","autumn2023","january","february",
  "openssl","hashcat","john","ripper","ophcrack","medusa","hydra",
  "correcthorse","batterystaple","horsebattery","Tr0ub4dor","P@ssw0rd1",
];

// Hash functions
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

async function sha1(str) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

function md5(str) {
  // Pure-JS MD5 (simplified)
  function safeAdd(x, y) { const l = (x & 0xFFFF) + (y & 0xFFFF); return (((x >> 16) + (y >> 16) + (l >> 16)) << 16) | (l & 0xFFFF); }
  function rotateLeft(n, c) { return (n << c) | (n >>> (32 - c)); }
  function cmn(q, a, b, x, s, t) { return safeAdd(rotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
  function ff(a,b,c,d,x,s,t){return cmn((b&c)|((~b)&d),a,b,x,s,t);}
  function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&(~d)),a,b,x,s,t);}
  function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t);}
  function ii(a,b,c,d,x,s,t){return cmn(c^(b|(~d)),a,b,x,s,t);}

  const rawBytes = new TextEncoder().encode(str);
  const bytes = String.fromCharCode(...rawBytes);
  const x = [];
  for (let i = 0; i < bytes.length; i++) x[i >> 2] |= bytes.charCodeAt(i) << ((i % 4) * 8);
  x[bytes.length >> 2] |= 0x80 << ((bytes.length % 4) * 8);
  x[(((bytes.length + 8) >> 6) + 1) * 16 - 2] = bytes.length * 8;

  let [a,b,c,d] = [1732584193,-271733879,-1732584194,271733878];
  for (let i = 0; i < x.length; i += 16) {
    const [oa,ob,oc,od]=[a,b,c,d];
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
  return [a,b,c,d].map(n=>{let s="";for(let i=0;i<4;i++)s+=("0"+((n>>>(i*8))&0xFF).toString(16)).slice(-2);return s;}).join("");
}

function detectHashType(h) {
  const t = h.trim();
  // Prefix-based (modern KDFs — NOT crackable here, only identifiable)
  if (t.startsWith("$2a$") || t.startsWith("$2b$") || t.startsWith("$2y$") || t.startsWith("$2x$")) return "bcrypt";
  if (t.startsWith("$argon2")) return "argon2";
  if (t.startsWith("$6$"))  return "SHA-512crypt";
  if (t.startsWith("$5$"))  return "SHA-256crypt";
  if (t.startsWith("$1$"))  return "MD5crypt";
  if (t.startsWith("$y$"))  return "yescrypt";
  if (t.startsWith("$P$") || t.startsWith("$H$")) return "PHPass";
  if (t.startsWith("sha256$")) return "Django SHA-256";
  if (t.startsWith("sha1$"))   return "Django SHA-1";
  // Hex-length based
  const len = t.replace(/\s/g,"").length;
  if (len === 32)  return "MD5";
  if (len === 40)  return "SHA-1";
  if (len === 64)  return "SHA-256";
  if (len === 96)  return "SHA-384";
  if (len === 128) return "SHA-512";
  if (len === 8)   return "CRC-32";
  return "Unknown";
}

// Types that require external tools (not crackable in-browser)
const EXTERNAL_ONLY = new Set(["bcrypt","argon2","SHA-512crypt","SHA-256crypt","MD5crypt","yescrypt","PHPass","Django SHA-256","Django SHA-1"]);
const EXTERNAL_INFO = {
  "bcrypt":        { why: "bcrypt is intentionally slow (cost factor prevents brute force)", tool: "hashcat -m 3200 or john --format=bcrypt" },
  "argon2":        { why: "Argon2 is memory-hard — designed to be GPU-resistant", tool: "hashcat -m 13400 (id) / -m 13600 (d)" },
  "SHA-512crypt":  { why: "Salted SHA-512 with thousands of rounds — very slow to crack", tool: "hashcat -m 1800 or john --format=sha512crypt" },
  "SHA-256crypt":  { why: "Salted SHA-256 with many rounds", tool: "hashcat -m 7400" },
  "MD5crypt":      { why: "Unix MD5 with 1000 rounds — weaker but still needs external tools", tool: "hashcat -m 500 or john --format=md5crypt" },
  "yescrypt":      { why: "Modern Linux default (Ubuntu 22+), very memory-hard", tool: "john --format=crypt" },
  "PHPass":        { why: "Iterated MD5 used by WordPress/phpBB", tool: "hashcat -m 400 or john --format=phpass" },
  "Django SHA-256":{ why: "PBKDF2-HMAC-SHA256 with salt", tool: "hashcat -m 10000 or john --format=django" },
  "Django SHA-1":  { why: "Legacy Django SHA-1 with salt", tool: "hashcat -m 124" },
};

export default function HashCrackerView({ addHistory }) {
  const [hash, setHash]         = useState("");
  const [hashType, setHashType] = useState("auto");
  const [status, setStatus]     = useState(null);
  const [cracking, setCracking] = useState(false);
  const [customWords, setCustomWords] = useState("");
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed]       = useState(null);   // hashes/sec
  const [elapsed, setElapsed]   = useState(null);   // ms
  const stopRef  = useRef(false);
  const startRef = useRef(null);

  const detectedType = hash.trim() ? detectHashType(hash.trim()) : null;
  const effectiveType = hashType === "auto" ? detectedType : hashType;
  const isExternalOnly = effectiveType && EXTERNAL_ONLY.has(effectiveType);

  const crack = async () => {
    const target = hash.trim().toLowerCase();
    if (!target) return;
    // Block external-only hashes with a helpful message
    if (isExternalOnly) {
      const info = EXTERNAL_INFO[effectiveType] || { why: "This hash type requires external tools.", tool: "hashcat or john the ripper" };
      setStatus({ state: "external", type: effectiveType, ...info });
      return;
    }
    setCracking(true);
    stopRef.current = false;
    startRef.current = performance.now();
    setStatus({ state: "running", tried: 0 });
    setProgress(0);
    setSpeed(null);
    setElapsed(null);

    const words = [
      ...WORDLIST,
      ...customWords.split(/\n|,/).map(w => w.trim()).filter(Boolean),
    ];

    let tried = 0;
    for (const word of words) {
      if (stopRef.current) { setStatus({ state: "stopped", tried }); setCracking(false); return; }

      let computed = "";
      try {
        if (effectiveType === "MD5") computed = md5(word);
        else if (effectiveType === "SHA-1") computed = await sha1(word);
        else if (effectiveType === "SHA-256") computed = await sha256(word);
      } catch {}

      tried++;
      setProgress(Math.round((tried / words.length) * 100));
      if (tried % 50 === 0) {
        const msNow = performance.now() - startRef.current;
        setSpeed(Math.round(tried / (msNow / 1000)));
        setElapsed(Math.round(msNow));
        setStatus(s => ({ ...s, tried }));
      }

      if (computed === target) {
        const crackedMs = Math.round(performance.now() - startRef.current);
        setElapsed(crackedMs);
        setSpeed(Math.round(tried / (crackedMs / 1000)));
        setStatus({ state: "cracked", word, tried, hash: target, type: effectiveType, ms: crackedMs });
        setCracking(false);
        addHistory?.("Hash Crack", target.slice(0, 20) + "…", `${word} · ${crackedMs}ms · ${Math.round(tried / (crackedMs / 1000))} h/s`);
        return;
      }

      // Yield every 100 iterations
      if (tried % 100 === 0) await new Promise(r => setTimeout(r, 0));
    }

    const failedMs = Math.round(performance.now() - startRef.current);
    setElapsed(failedMs);
    setSpeed(Math.round(tried / (failedMs / 1000)));
    setStatus({ state: "failed", tried, ms: failedMs });
    setCracking(false);
  };

  const generateHash = async () => {
    const word = customWords.split(/\n|,/)[0]?.trim() || "password";
    const m = md5(word);
    const s1 = await sha1(word);
    const s256 = await sha256(word);
    setStatus({ state: "generated", word, md5: m, sha1: s1, sha256: s256 });
  };

  return (
    <div>
      <div className="section-header">
        <h3>Hash Cracker</h3>
        <p>Dictionary attack against MD5, SHA-1, and SHA-256 hashes. Useful for CTF password hashes.</p>
      </div>

      <div style={{ background:"#7c2d1222", border:"1px solid #f9731633", borderRadius:6, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#fb923c" }}>
        ⚠️ <strong>CTF &amp; Authorized Use Only.</strong> This tool performs dictionary attacks on MD5/SHA hashes for CTF and educational purposes only. It is not a replacement for Hashcat or John the Ripper. Do not use against hashes you are not authorized to test. Hashes cannot be "decrypted" — this tool searches for matching plaintext candidates.
      </div>

      <div className="grid2" style={{ marginBottom: 12 }}>
        <div className="card">
          <div className="card-title">Target Hash</div>
          <label>Hash value</label>
          <input
            value={hash}
            onChange={e => setHash(e.target.value)}
            placeholder="Paste MD5, SHA-1, or SHA-256 hash…"
            style={{ fontFamily: "monospace", marginBottom: 8 }}
          />
          {detectedType && (
            <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 8 }}>
              Auto-detected: <b>{detectedType}</b> ({hash.trim().length} hex chars)
            </div>
          )}

          <label>Hash type</label>
          <select value={hashType} onChange={e => setHashType(e.target.value)} style={{ marginBottom: 12 }}>
            <option value="auto">Auto-detect</option>
            <option value="MD5">MD5</option>
            <option value="SHA-1">SHA-1</option>
            <option value="SHA-256">SHA-256</option>
          </select>

          <label>Custom wordlist additions (one per line or comma-separated)</label>
          <textarea
            value={customWords}
            onChange={e => setCustomWords(e.target.value)}
            placeholder="extra_word1&#10;extra_word2&#10;flag{...}"
            style={{ minHeight: 70, marginBottom: 10 }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={crack} disabled={cracking || !hash.trim()} style={{ flex: 1 }}>
              {cracking ? `⏳ Cracking… ${progress}%` : "🔨 Crack Hash"}
            </button>
            {cracking && (
              <button className="btn btn-ghost" onClick={() => { stopRef.current = true; }}>
                ■ Stop
              </button>
            )}
          </div>

          {cracking && (
            <div style={{ marginTop: 8 }}>
              <div style={{ background: "var(--bg-hover)", borderRadius: 3, height: 4, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent)", transition: ".1s" }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                Tried {status?.tried || 0} / {WORDLIST.length + customWords.split(/\n|,/).filter(w=>w.trim()).length} words
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Result</div>
          {!status && (
            <div style={{ color: "var(--text-3)", fontSize: 13 }}>Crack result appears here…</div>
          )}
          {status?.state === "running" && (
            <div>
              <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 8, fontFamily: "var(--font-mono)" }}>
                ▸ Searching wordlist…
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 8 }}>
                {[
                  ["Tried", status.tried.toLocaleString()],
                  ["Speed", speed ? `${speed.toLocaleString()} h/s` : "—"],
                  ["Time", elapsed ? `${elapsed}ms` : "—"],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "#020810", border: "1px solid #0f2035", borderRadius: 5, padding: "6px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#475569", fontFamily: "var(--font-mono)", letterSpacing: "1px" }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {status?.state === "external" && (
            <div>
              <div style={{ fontSize: 18, marginBottom: 8 }}>🔒</div>
              <div style={{ fontWeight: 700, color: "var(--yellow)", fontSize: 14, marginBottom: 8 }}>
                {status.type} — Cannot crack in-browser
              </div>
              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 10 }}>
                <b style={{ color: "var(--text-1)" }}>Why:</b> {status.why}
              </div>
              <div style={{ background: "var(--bg-output)", border: "1px solid var(--border)", borderRadius: 5, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4, letterSpacing: "1px", textTransform: "uppercase" }}>Use external tool:</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--yellow)", wordBreak: "break-all" }}>{status.tool}</div>
              </div>
              <div className="info-box" style={{ marginTop: 10, fontSize: 11 }}>
                The Hash Identifier above can confirm the exact format. For bcrypt, hashcat mode <b>3200</b> or john <b>--format=bcrypt</b>.
              </div>
            </div>
          )}
          {status?.state === "cracked" && (
            <div>
              <div style={{ fontSize: 20, marginBottom: 8 }}>🎉</div>
              <div style={{ fontWeight: 700, color: "var(--green)", fontSize: 16, marginBottom: 4 }}>Cracked!</div>
              <div className="kv"><span>Plaintext</span><span style={{ fontFamily:"monospace", color:"#fbbf24" }}>{status.word}</span></div>
              <div className="kv"><span>Hash type</span><span>{status.type}</span></div>
              <div className="kv"><span>Words tried</span><span>{status.tried.toLocaleString()}</span></div>
              <div className="kv"><span>Time</span><span style={{ color: "#00e87a" }}>{status.ms}ms</span></div>
              <div className="kv"><span>Speed</span><span style={{ color: "#00d4ff" }}>{speed ? speed.toLocaleString() + " h/s" : "—"}</span></div>
              <div style={{ marginTop: 10 }}>
                <div className="output" style={{ color: "#86efac" }}>{status.word}</div>
              </div>
            </div>
          )}
          {status?.state === "failed" && (
            <div>
              <div style={{ fontSize: 20, marginBottom: 8 }}>❌</div>
              <div style={{ color: "var(--red)", fontWeight: 600, marginBottom: 8 }}>Not in wordlist</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
                {[
                  ["Tried", status.tried.toLocaleString()],
                  ["Speed", speed ? speed.toLocaleString() + " h/s" : "—"],
                  ["Time", status.ms ? status.ms + "ms" : "—"],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "#020810", border: "1px solid #0f2035", borderRadius: 5, padding: "6px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#475569", fontFamily: "var(--font-mono)", letterSpacing: "1px" }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#64748b", fontFamily: "var(--font-mono)", marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                Not found in {status.tried} words. Add custom words or use hashcat with rockyou.txt.
              </div>
            </div>
          )}
          {status?.state === "stopped" && (
            <div style={{ color: "var(--yellow)", fontSize: 13 }}>Stopped after {status.tried} attempts.</div>
          )}
          {status?.state === "generated" && (
            <div>
              <div style={{ color: "var(--text-2)", fontSize: 12, marginBottom: 10 }}>Hashes for "<b style={{color:"#f1f5f9"}}>{status.word}</b>":</div>
              <div className="kv"><span>MD5</span><span style={{ fontFamily:"monospace", fontSize:11, color:"#fbbf24" }}>{status.md5}</span></div>
              <div className="kv"><span>SHA-1</span><span style={{ fontFamily:"monospace", fontSize:11, color:"#fbbf24" }}>{status.sha1}</span></div>
              <div className="kv"><span>SHA-256</span><span style={{ fontFamily:"monospace", fontSize:11, color:"#fbbf24" }}>{status.sha256}</span></div>
            </div>
          )}
        </div>
      </div>

      {/* Hash generator */}
      <div className="card">
        <div className="card-title">Hash Generator (for testing)</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label>Word to hash (first line of custom words, or "password")</label>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>Type a word in the custom wordlist field above, then click Generate</div>
          </div>
          <button className="btn btn-ghost" onClick={generateHash} style={{ flexShrink: 0 }}>Generate Hashes</button>
        </div>
      </div>

      {/* Built-in wordlist info */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">Built-in Wordlist ({WORDLIST.length} words)</div>
        <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.6 }}>
          {WORDLIST.slice(0, 40).join(", ")}… and more
        </div>
        <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 6 }}>
          Includes common passwords, CTF patterns, and flag{"{...}"} variants. Add your own words in the field above.
        </div>
      </div>
    </div>
  );
}
