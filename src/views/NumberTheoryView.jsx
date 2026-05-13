import { useState } from "react";
import { gcd, extendedGCDSteps, modInverse, modPow, crt, millerRabin, factorize, eulerTotient } from "../crypto/numberTheory.js";
import { CopyBtn } from "../components/Output.jsx";

function BigResult({ label, value, color = "#93c5fd" }) {
  if (value === null || value === undefined) return null;
  const str = value.toString();
  return (
    <div style={{ background: "#070b16", borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "monospace", fontSize: 12, color, wordBreak: "break-all", position: "relative" }}>
        <CopyBtn text={str} />
        {str}
      </div>
    </div>
  );
}

const TABS = [
  ["gcd",     "GCD / Extended"],
  ["modinv",  "Mod Inverse"],
  ["modpow",  "Mod Exponent"],
  ["crt",     "CRT"],
  ["prime",   "Primality"],
  ["factor",  "Factorize"],
  ["totient", "φ(n)"],
];

export default function NumberTheoryView({ addHistory }) {
  const [tab, setTab] = useState("gcd");

  // GCD state
  const [gA, setGA] = useState(""); const [gB, setGB] = useState(""); const [gRes, setGRes] = useState(null);
  const runGCD = () => {
    try {
      const res = extendedGCDSteps(gA, gB);
      setGRes(res);
      addHistory("Extended GCD", `gcd(${gA},${gB})`, `gcd=${res.gcd}, x=${res.x}, y=${res.y}`);
    } catch(e) { setGRes({ error: e.message }); }
  };

  // Mod inverse state
  const [miA, setMiA] = useState(""); const [miM, setMiM] = useState(""); const [miRes, setMiRes] = useState(null);
  const runModInv = () => {
    try {
      const r = modInverse(miA, miM);
      setMiRes(r);
      addHistory("Mod Inverse", `${miA}^-1 mod ${miM}`, r !== null ? r.toString() : "No inverse");
    } catch(e) { setMiRes({ error: e.message }); }
  };

  // Mod pow state
  const [mpBase, setMpBase] = useState(""); const [mpExp, setMpExp] = useState(""); const [mpMod, setMpMod] = useState(""); const [mpRes, setMpRes] = useState(null);
  const runModPow = () => {
    try {
      const r = modPow(mpBase, mpExp, mpMod);
      setMpRes(r);
      addHistory("Mod Exponent", `${mpBase}^${mpExp} mod ${mpMod}`, r.toString());
    } catch(e) { setMpRes({ error: e.message }); }
  };

  // CRT state
  const [crtR, setCrtR] = useState("2,3,1"); const [crtM, setCrtM] = useState("3,5,7"); const [crtRes, setCrtRes] = useState(null);
  const runCRT = () => {
    try {
      const rems = crtR.split(",").map(s => s.trim());
      const mods = crtM.split(",").map(s => s.trim());
      const r = crt(rems, mods);
      setCrtRes(r);
      addHistory("CRT", `r=[${rems}] m=[${mods}]`, r.error || `x=${r.x}`);
    } catch(e) { setCrtRes({ error: e.message }); }
  };

  // Primality state
  const [prN, setPrN] = useState(""); const [prRes, setPrRes] = useState(null);
  const runPrime = () => {
    try {
      const r = millerRabin(prN);
      setPrRes(r);
      addHistory("Primality", prN, r.isPrime ? "Prime" : "Composite");
    } catch(e) { setPrRes({ error: e.message }); }
  };

  // Factorize state
  const [fN, setFN] = useState(""); const [fRes, setFRes] = useState(null);
  const runFactor = () => {
    try {
      const r = factorize(fN);
      setFRes(r);
      addHistory("Factorize", fN, r.error || r.factors.map(f => `${f.prime}^${f.exp}`).join(" × "));
    } catch(e) { setFRes({ error: e.message }); }
  };

  // Totient state
  const [tN, setTN] = useState(""); const [tRes, setTRes] = useState(null);
  const runTotient = () => {
    try {
      const r = eulerTotient(tN);
      setTRes(r);
      addHistory("Euler Totient", `φ(${tN})`, r !== null ? r.toString() : "Error");
    } catch(e) { setTRes({ error: e.message }); }
  };

  return (
    <div>
      <div className="section-header">
        <h3>Number Theory Calculator</h3>
        <p>Extended Euclidean, modular inverse, fast exponentiation, CRT, Miller-Rabin primality, factorization. All using BigInt for arbitrary precision.</p>
      </div>

      <div className="tabs-wrap" style={{ flexWrap: "wrap" }}>
        {TABS.map(([id, label]) => (
          <button key={id} className={`tab${tab===id?" active":""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "gcd" && (
        <div className="card">
          <div className="card-title">Extended GCD — finds gcd(a,b) and Bézout coefficients</div>
          <div className="row">
            <div><label>a</label><input value={gA} onChange={e=>setGA(e.target.value)} placeholder="e.g. 252" style={{fontFamily:"monospace"}} /></div>
            <div><label>b</label><input value={gB} onChange={e=>setGB(e.target.value)} placeholder="e.g. 105" style={{fontFamily:"monospace"}} /></div>
          </div>
          <button className="btn btn-primary" style={{width:"100%",marginBottom:12}} onClick={runGCD}>Compute ↗</button>
          {gRes && (
            gRes.error ? <div style={{color:"#ef4444"}}>{gRes.error}</div> : (
              <>
                <BigResult label={`gcd(${gA}, ${gB})`} value={gRes.gcd} color="#86efac" />
                <BigResult label={`x (so that a·x + b·y = gcd)`} value={gRes.x} />
                <BigResult label={`y`} value={gRes.y} />
                <div className="info-box">
                  Verification: {gA} × {gRes.x?.toString()} + {gB} × {gRes.y?.toString()} = {gRes.gcd?.toString()}
                </div>
                {gRes.steps?.length > 0 && (
                  <div style={{marginTop:10}}>
                    <div className="card-title">Division Steps</div>
                    <div style={{maxHeight:200,overflowY:"auto"}}>
                      {gRes.steps.map((s,i) => (
                        <div key={i} style={{fontSize:11,fontFamily:"monospace",color:"#64748b",padding:"2px 0"}}>
                          {s.r.toString()} = {s.q.toString()} × {s.divisor.toString()} + {s.remainder.toString()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
          )}
        </div>
      )}

      {tab === "modinv" && (
        <div className="card">
          <div className="card-title">Modular Inverse — find a⁻¹ mod m</div>
          <div style={{fontSize:12,color:"#64748b",marginBottom:10}}>
            Finds x such that a·x ≡ 1 (mod m). Used to compute RSA private key d = e⁻¹ mod φ(n).
          </div>
          <div className="row">
            <div><label>a</label><input value={miA} onChange={e=>setMiA(e.target.value)} placeholder="e.g. 65537" style={{fontFamily:"monospace"}} /></div>
            <div><label>m</label><input value={miM} onChange={e=>setMiM(e.target.value)} placeholder="e.g. φ(n)" style={{fontFamily:"monospace"}} /></div>
          </div>
          <button className="btn btn-primary" style={{width:"100%",marginBottom:12}} onClick={runModInv}>Compute ↗</button>
          {miRes !== null && (
            miRes?.error ? <div style={{color:"#ef4444"}}>{miRes.error}</div>
            : miRes === null ? <div style={{color:"#ef4444"}}>No modular inverse exists — gcd(a, m) ≠ 1</div>
            : <BigResult label={`${miA}⁻¹ mod ${miM}`} value={miRes} color="#86efac" />
          )}
        </div>
      )}

      {tab === "modpow" && (
        <div className="card">
          <div className="card-title">Modular Exponentiation — base^exp mod m</div>
          <div style={{fontSize:12,color:"#64748b",marginBottom:10}}>
            Fast square-and-multiply. RSA encrypt: c = m^e mod n. Decrypt: m = c^d mod n.
          </div>
          <div className="row">
            <div><label>base</label><input value={mpBase} onChange={e=>setMpBase(e.target.value)} style={{fontFamily:"monospace"}} /></div>
            <div><label>exponent</label><input value={mpExp} onChange={e=>setMpExp(e.target.value)} style={{fontFamily:"monospace"}} /></div>
            <div><label>modulus</label><input value={mpMod} onChange={e=>setMpMod(e.target.value)} style={{fontFamily:"monospace"}} /></div>
          </div>
          <button className="btn btn-primary" style={{width:"100%",marginBottom:12}} onClick={runModPow}>Compute ↗</button>
          {mpRes !== null && (
            mpRes?.error ? <div style={{color:"#ef4444"}}>{mpRes.error}</div>
            : <BigResult label={`${mpBase}^${mpExp} mod ${mpMod}`} value={mpRes} color="#86efac" />
          )}
        </div>
      )}

      {tab === "crt" && (
        <div className="card">
          <div className="card-title">Chinese Remainder Theorem</div>
          <div style={{fontSize:12,color:"#64748b",marginBottom:10}}>
            Solve x ≡ r₁ (mod m₁), x ≡ r₂ (mod m₂), … Enter comma-separated values.
          </div>
          <div style={{marginBottom:10}}>
            <label>Remainders (comma-separated)</label>
            <input value={crtR} onChange={e=>setCrtR(e.target.value)} placeholder="2,3,1" style={{fontFamily:"monospace"}} />
          </div>
          <div style={{marginBottom:12}}>
            <label>Moduli (comma-separated, must be pairwise coprime)</label>
            <input value={crtM} onChange={e=>setCrtM(e.target.value)} placeholder="3,5,7" style={{fontFamily:"monospace"}} />
          </div>
          <button className="btn btn-primary" style={{width:"100%",marginBottom:12}} onClick={runCRT}>Solve ↗</button>
          {crtRes && (
            crtRes.error ? <div style={{color:"#ef4444"}}>{crtRes.error}</div>
            : (
              <>
                <BigResult label="x (smallest positive solution)" value={crtRes.x} color="#86efac" />
                <BigResult label="N (product of moduli)" value={crtRes.N} />
                <div className="info-box">
                  Solution repeats every N = {crtRes.N?.toString()} (any x + k·N is also a solution)
                </div>
              </>
            )
          )}
        </div>
      )}

      {tab === "prime" && (
        <div className="card">
          <div className="card-title">Miller-Rabin Primality Test</div>
          <div style={{fontSize:12,color:"#64748b",marginBottom:10}}>
            Probabilistic test using witnesses [2,3,5,7,11,13,17,19,23,29,31,37].
            Deterministic for n &lt; 3.3 × 10²⁴.
          </div>
          <div style={{marginBottom:12}}>
            <label>n</label>
            <input value={prN} onChange={e=>setPrN(e.target.value)} placeholder="e.g. 982451653" style={{fontFamily:"monospace"}} />
          </div>
          <button className="btn btn-primary" style={{width:"100%",marginBottom:12}} onClick={runPrime}>Test ↗</button>
          {prRes && (
            prRes.error ? <div style={{color:"#ef4444"}}>{prRes.error}</div>
            : (
              <>
                <div style={{
                  padding:"12px 16px", borderRadius:8, marginBottom:10,
                  background: prRes.isPrime ? "#14532d33" : "#7f1d1d33",
                  border:`1px solid ${prRes.isPrime?"#22c55e":"#ef4444"}`,
                  fontSize:16, fontWeight:700,
                  color: prRes.isPrime ? "#86efac" : "#f87171",
                }}>
                  {prN} is {prRes.isPrime ? "✅ Prime" : "❌ Composite"}
                </div>
                {!prRes.isPrime && prRes.failedWitnesses?.length > 0 && (
                  <div className="info-box">
                    Composite witness{prRes.failedWitnesses.length>1?"es":""}: {prRes.failedWitnesses.join(", ")}
                  </div>
                )}
                <div className="info-box">
                  n−1 = 2^{prRes.r} × {prRes.d} | Witnesses tested: {prRes.witnesses?.join(", ")}
                </div>
              </>
            )
          )}
        </div>
      )}

      {tab === "factor" && (
        <div className="card">
          <div className="card-title">Integer Factorization (trial division, max ~10¹⁵)</div>
          <div style={{marginBottom:12}}>
            <label>n</label>
            <input value={fN} onChange={e=>setFN(e.target.value)} placeholder="e.g. 1234567890" style={{fontFamily:"monospace"}} />
          </div>
          <button className="btn btn-primary" style={{width:"100%",marginBottom:12}} onClick={runFactor}>Factor ↗</button>
          {fRes && (
            fRes.error ? <div style={{color:"#ef4444"}}>{fRes.error}</div>
            : (
              <>
                <div style={{fontSize:14,fontWeight:700,color:"#86efac",marginBottom:10,fontFamily:"monospace"}}>
                  {fN} = {fRes.factors.map(f => f.exp > 1 ? `${f.prime}^${f.exp}` : f.prime).join(" × ")}
                </div>
                {fRes.factors.map(({prime, exp}) => (
                  <BigResult key={prime} label={`Prime factor${exp>1?` (×${exp})`:""}`} value={prime} />
                ))}
                <div className="info-box">
                  {fRes.isPrime ? "n is prime." : `${fRes.factors.length} distinct prime factor${fRes.factors.length>1?"s":""}.`}
                </div>
              </>
            )
          )}
        </div>
      )}

      {tab === "totient" && (
        <div className="card">
          <div className="card-title">Euler's Totient φ(n)</div>
          <div style={{fontSize:12,color:"#64748b",marginBottom:10}}>
            φ(n) = count of integers 1 ≤ k ≤ n with gcd(k,n)=1. For RSA: φ(p×q) = (p−1)(q−1).
          </div>
          <div style={{marginBottom:12}}>
            <label>n</label>
            <input value={tN} onChange={e=>setTN(e.target.value)} placeholder="e.g. 3233 (= 61×53)" style={{fontFamily:"monospace"}} />
          </div>
          <button className="btn btn-primary" style={{width:"100%",marginBottom:12}} onClick={runTotient}>Compute ↗</button>
          {tRes !== null && (
            tRes?.error ? <div style={{color:"#ef4444"}}>{tRes.error}</div>
            : <BigResult label={`φ(${tN})`} value={tRes} color="#86efac" />
          )}
        </div>
      )}
    </div>
  );
}
