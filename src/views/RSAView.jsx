import { useState } from "react";
import { analyzeRSA, rsaDecrypt, smallExponentAttack, fermatAttack, wienerAttack, commonFactorAttack } from "../crypto/rsa.js";
import { CopyBtn } from "../components/Output.jsx";

const ATTACK_COLORS = { true: "#86efac", false: "#f87171" };

function ResultBlock({ result }) {
  if (!result) return null;
  const success = result.success === true;
  const color = success ? "#86efac" : result.error ? "#f87171" : "#94a3b8";

  return (
    <div style={{
      background: success ? "#14532d22" : result.error ? "#7f1d1d22" : "#1e293b22",
      border: `1px solid ${success ? "#22c55e55" : result.error ? "#ef444455" : "#1e293b"}`,
      borderRadius: 6, padding: 12, marginBottom: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, color, fontSize: 13 }}>
          {success ? "✅" : result.error ? "❌" : "⚪"} {result.name || result.attack || "Result"}
        </span>
        {result.note && <span style={{ fontSize: 11, color: "#64748b" }}>{result.note}</span>}
      </div>

      {result.error && <div style={{ color: "#f87171", fontSize: 12 }}>{result.error}</div>}

      {success && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {[
            result.p         && ["p",            result.p],
            result.q         && ["q",            result.q],
            result.d         && ["d (private)",  result.d],
            result.phi       && ["φ(n)",         result.phi],
            result.m         && ["m (decimal)",  result.m],
            result.ascii     && ["Plaintext",    result.ascii],
            result.sharedFactor && ["Shared factor", result.sharedFactor],
            result.iterations  && ["Iterations",    result.iterations],
            result.k           && ["Convergent k",  result.k],
          ].filter(Boolean).map(([k, v]) => (
            <div key={k} style={{ background: "#070b16", borderRadius: 6, padding: "6px 10px" }}>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>{k}</div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: k === "Plaintext" ? "#86efac" : "#93c5fd",
                fontFamily: "monospace", wordBreak: "break-all",
                maxHeight: 60, overflow: "hidden",
              }}>
                {v.length > 80 ? v.slice(0, 80) + "…" : v}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RSAView({ addHistory }) {
  const [n, setN]   = useState("");
  const [e, setE]   = useState("65537");
  const [c, setC]   = useState("");
  const [p, setP]   = useState("");
  const [q, setQ]   = useState("");
  const [n2, setN2] = useState("");
  const [tab, setTab] = useState("analyze");
  const [results, setResults] = useState(null);
  const [decResult, setDecResult] = useState(null);

  const runAnalysis = () => {
    const r = analyzeRSA(n, e, c, n2);
    setResults(r);
    const successes = r.results?.filter(x => x.success).map(x => x.name).join(", ") || "none";
    addHistory("RSA Analysis", `n=${n.slice(0,20)}…`, `Successful: ${successes}`);
  };

  const runDecrypt = () => {
    const r = rsaDecrypt(n, e, p, q, c);
    setDecResult(r);
    addHistory("RSA Decrypt", `p=${p.slice(0,15)}…`, r.ascii || r.error || "");
  };

  return (
    <div>
      <div className="section-header">
        <h3>RSA Weak Key Attacks</h3>
        <p>Fermat factoring, Wiener's attack, small exponent, common factor GCD, and manual decrypt with known p, q.</p>
      </div>

      <div style={{ background:"#7c2d1222", border:"1px solid #f9731633", borderRadius:6, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#fb923c" }}>
        ⚠️ <strong>Educational &amp; CTF Use Only.</strong> This tool is intended for learning, CTF competitions, and authorized security research. Do not use against real systems or keys you do not own. It is not a replacement for Hashcat, SageMath, or professional RSA auditing tools.
      </div>

      <div className="tabs-wrap">
        {[["analyze","Auto-Analyze"],["manual","Manual Decrypt"],["explain","Attack Guide"]].map(([id,label]) => (
          <button key={id} className={`tab${tab===id?" active":""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "analyze" && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 10 }}>
              <label>n (modulus)</label>
              <textarea value={n} onChange={e=>setN(e.target.value)} rows={3} style={{fontFamily:"monospace",fontSize:11}} placeholder="e.g. 179769313486231590..." />
            </div>
            <div className="row">
              <div><label>e (public exponent)</label><input value={e} onChange={x=>setE(x.target.value)} style={{fontFamily:"monospace"}} /></div>
              <div><label>c (ciphertext, optional)</label><input value={c} onChange={x=>setC(x.target.value)} style={{fontFamily:"monospace"}} /></div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>n2 (second modulus for GCD attack, optional)</label>
              <input value={n2} onChange={x=>setN2(x.target.value)} style={{fontFamily:"monospace",fontSize:11}} placeholder="Second RSA modulus to check for common factor" />
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={runAnalysis}>
              Run All Attacks ↗
            </button>
          </div>

          {results?.error && <div className="card"><div style={{color:"#ef4444"}}>{results.error}</div></div>}
          {results?.results && (
            <div>
              <div className="card-title" style={{ marginBottom: 8 }}>Results</div>
              {results.results.map((r, i) => <ResultBlock key={i} result={r} />)}
            </div>
          )}
        </>
      )}

      {tab === "manual" && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 10 }}>
              <label>n (modulus)</label>
              <textarea value={n} onChange={e=>setN(e.target.value)} rows={2} style={{fontFamily:"monospace",fontSize:11}} placeholder="n = p × q" />
            </div>
            <div className="row">
              <div><label>e</label><input value={e} onChange={x=>setE(x.target.value)} style={{fontFamily:"monospace"}} /></div>
              <div><label>p (prime factor)</label><input value={p} onChange={x=>setP(x.target.value)} style={{fontFamily:"monospace"}} /></div>
            </div>
            <div className="row">
              <div><label>q (prime factor)</label><input value={q} onChange={x=>setQ(x.target.value)} style={{fontFamily:"monospace"}} /></div>
              <div><label>c (ciphertext)</label><input value={c} onChange={x=>setC(x.target.value)} style={{fontFamily:"monospace"}} /></div>
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={runDecrypt}>
              Decrypt ↗
            </button>
          </div>
          {decResult && (
            <div className="card">
              {decResult.error
                ? <div style={{color:"#ef4444"}}>{decResult.error}</div>
                : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                      {[["d",decResult.d],["φ(n)",decResult.phi]].map(([k,v]) => (
                        <div key={k} style={{background:"#070b16",borderRadius:6,padding:"8px 10px"}}>
                          <div style={{fontSize:10,color:"#475569"}}>{k}</div>
                          <div style={{fontSize:11,fontFamily:"monospace",color:"#93c5fd",wordBreak:"break-all",maxHeight:50,overflow:"hidden"}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{marginBottom:6,display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:".5px"}}>Plaintext (ASCII)</span>
                      <CopyBtn text={decResult.ascii} />
                    </div>
                    <div style={{background:"#070b16",border:"1px solid #22c55e33",borderRadius:6,padding:"10px 12px",fontFamily:"monospace",fontSize:13,color:"#86efac",wordBreak:"break-all"}}>
                      {decResult.ascii || "(non-printable bytes)"}
                    </div>
                  </>
                )
              }
            </div>
          )}
        </>
      )}

      {tab === "explain" && (
        <div className="card">
          <div className="card-title">RSA Attack Reference</div>
          {[
            {
              name: "Fermat Factoring",
              when: "p and q are close together (|p−q| is small)",
              how: "Start from √n, increment a until a²−n is a perfect square. Then p=a+b, q=a−b.",
              check: "Works best on CTF challenges with obviously weak key generation. Fails on properly generated keys.",
            },
            {
              name: "Wiener's Attack",
              when: "d < n^0.25 (private exponent is small)",
              how: "Compute continued fraction of e/n. Each convergent k/d is a candidate. Check if φ(n)=(ed−1)/k gives integer p,q.",
              check: "e will be unusually large (close to n). d will be small (challenge will hint at 'fast decryption').",
            },
            {
              name: "Small Exponent (e=3)",
              when: "e=3 and plaintext is short/unpadded so m³ < n",
              how: "c = m³ mod n. If m³ < n then no mod occurred: just compute cube root of c.",
              check: "e=3 or e=17. No OAEP padding. Plaintext is short.",
            },
            {
              name: "Common Factor (GCD)",
              when: "Two different RSA keys share a prime factor (weak RNG reuse)",
              how: "gcd(n₁, n₂). If not 1, the result is the shared prime p. Then q₁=n₁/p, q₂=n₂/p.",
              check: "You're given multiple public keys. Classic large-scale survey attack (Heninger et al. 2012).",
            },
          ].map(({ name, when, how, check }) => (
            <div key={name} style={{ padding: "12px 0", borderBottom: "1px solid #1e293b" }}>
              <div style={{ fontWeight: 700, color: "#93c5fd", marginBottom: 6 }}>{name}</div>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 4, fontSize: 12, lineHeight: 1.6 }}>
                <span style={{ color: "#475569" }}>When:</span><span style={{ color: "#e2e8f0" }}>{when}</span>
                <span style={{ color: "#475569" }}>How:</span><span style={{ color: "#e2e8f0" }}>{how}</span>
                <span style={{ color: "#475569" }}>Signs:</span><span style={{ color: "#fbbf24" }}>{check}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
