import { useState, useMemo, useEffect } from "react";
import { CHALLENGES, CATEGORIES, MAX_SCORE } from "../data/challenges.js";
import { CopyBtn } from "../components/Output.jsx";

const DIFF_LABEL = { 1:"Beginner", 2:"Intermediate", 3:"Advanced" };
const DIFF_COL   = { 1:"#22c55e", 2:"#f59e0b", 3:"#ef4444" };
const CAT_COL = {
  "Classical":"#93c5fd","Encoding":"#86efac","XOR":"#fbbf24",
  "Transposition":"#f9a8d4","Web Crypto":"#a78bfa","Steganography":"#34d399",
  "Stream Cipher":"#f472b6","Hash":"#fb923c","Crypto Math":"#a78bfa",
  "Modern Crypto":"#22d3ee","Analysis":"#facc15","Forensics":"#94a3b8",
};

// ── Scoreboard ─────────────────────────────────────────────────────────────────
function Scoreboard({ solved, hintMap, startTime }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t=setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(t); },[]);

  const totalPoints = Object.keys(solved).reduce((sum,id)=>{
    const ch=CHALLENGES.find(c=>c.id===id);
    return sum+Math.max(0,ch.difficulty*100-(hintMap[id]||0)*25);
  },0);
  const solvedCount = Object.keys(solved).length;
  const pct = Math.round((totalPoints/MAX_SCORE)*100);
  const elapsed = startTime ? Math.floor((now-startTime)/1000) : 0;
  const h=Math.floor(elapsed/3600), m=Math.floor((elapsed%3600)/60), s=elapsed%60;
  const timeStr = `${h?h+"h ":""}${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;

  const rank = pct>=90?"🏆 Elite":pct>=70?"🥇 Expert":pct>=45?"🥈 Intermediate":pct>=20?"🥉 Novice":"🔐 Locked";

  return (
    <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:10, padding:16, marginBottom:14 }}>
      <div style={{ display:"flex", gap:16, alignItems:"center" }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
            <span style={{ fontSize:28, fontWeight:800, color:"var(--accent)", fontVariantNumeric:"tabular-nums" }}>
              {totalPoints}
            </span>
            <span style={{ fontSize:13, color:"var(--text-3)" }}>/ {MAX_SCORE} pts</span>
          </div>
          <div style={{ fontSize:12, color:"var(--text-2)", marginTop:2 }}>
            {solvedCount} / {CHALLENGES.length} solved
            {startTime && <span style={{ marginLeft:10, fontFamily:"monospace", color:"var(--text-3)" }}>⏱ {timeStr}</span>}
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:22 }}>{rank.split(" ")[0]}</div>
          <div style={{ fontSize:11, color:"var(--text-2)" }}>{rank.split(" ").slice(1).join(" ")}</div>
        </div>
      </div>
      <div style={{ height:6, borderRadius:3, background:"var(--bg-hover)", overflow:"hidden", marginTop:10 }}>
        <div style={{ width:`${pct}%`, height:"100%", borderRadius:3, transition:".5s", background:"linear-gradient(90deg,var(--accent),#06b6d4)" }} />
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8 }}>
        {CATEGORIES.map(cat=>{
          const all=CHALLENGES.filter(c=>c.category===cat);
          const done=all.filter(c=>solved[c.id]).length;
          const col=CAT_COL[cat]||"#94a3b8";
          return (
            <div key={cat} style={{
              fontSize:10.5, padding:"2px 7px", borderRadius:4, fontWeight:600,
              background: done===all.length ? col+"22" : "var(--bg-hover)",
              color: done===all.length ? col : "var(--text-3)",
              border:`1px solid ${done===all.length ? col+"44":"var(--border)"}`,
            }}>
              {cat} {done}/{all.length}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Challenge Card ─────────────────────────────────────────────────────────────
function ChallengeCard({ challenge, solved, onSelect }) {
  const { id, title, category, difficulty } = challenge;
  const col = CAT_COL[category]||"#94a3b8";
  const pts = difficulty*100;
  return (
    <div onClick={() => onSelect(id)} className="ctf-card"
      style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", marginBottom:6,
        background: solved ? "#052e1622" : "var(--bg-card)",
        border:`1px solid ${solved?"#22c55e44":"var(--border)"}` }}>
      {/* Points block */}
      <div style={{ textAlign:"center", minWidth:48, flexShrink:0 }}>
        <div style={{ fontSize:18, fontWeight:800, color: solved?"var(--green)":"var(--accent)", lineHeight:1 }}>{solved?"✓":pts}</div>
        <div style={{ fontSize:9, color:"var(--text-3)", marginTop:2 }}>PTS</div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", gap:7, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
          <span style={{ fontWeight:600, color:"var(--text-1)", fontSize:13 }}>{title}</span>
          {challenge.imageFull && <span style={{ fontSize:10, color:"#34d399", background:"#052e1622", padding:"1px 5px", borderRadius:3, border:"1px solid #22c55e33" }}>🖼 IMAGE</span>}
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          <span style={{ background:col+"18", color:col, padding:"1px 7px", borderRadius:10, fontSize:10, fontWeight:600, border:`1px solid ${col}33` }}>{category}</span>
          <span style={{ background:DIFF_COL[difficulty]+"18", color:DIFF_COL[difficulty], padding:"1px 7px", borderRadius:10, fontSize:10, fontWeight:600 }}>{DIFF_LABEL[difficulty]}</span>
        </div>
      </div>
      <span style={{ color:"var(--text-3)", fontSize:16, flexShrink:0 }}>{solved?"":"›"}</span>
    </div>
  );
}

// ── Active Challenge ───────────────────────────────────────────────────────────
function ActiveChallenge({ challenge, solved, onSolve, onBack, hintsUsed, onUseHint }) {
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong]   = useState(false);
  const [showExplan, setShowExplan] = useState(false);
  const [imgExpanded, setImgExpanded] = useState(false);

  const tryAnswer = () => {
    const clean = answer.trim().toLowerCase().replace(/\s+/g,"");
    const flag  = challenge.flag.toLowerCase().replace(/\s+/g,"");
    if(clean===flag||clean===flag.replace(/flag\{|\}/g,"")){
      onSolve(challenge.id, hintsUsed); setWrong(false);
    } else { setWrong(true); setTimeout(()=>setWrong(false),1500); }
  };

  const pts = Math.max(0, challenge.difficulty*100 - hintsUsed*25);
  const col = CAT_COL[challenge.category]||"#94a3b8";

  return (
    <div>
      {/* Back + meta */}
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", gap:7, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontWeight:700, color:"var(--text-1)", fontSize:14 }}>{challenge.title}</span>
            {solved && <span style={{ fontSize:13 }}>✅</span>}
          </div>
          <div style={{ display:"flex", gap:6, marginTop:4 }}>
            <span style={{ background:col+"18", color:col, padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, border:`1px solid ${col}33` }}>{challenge.category}</span>
            <span style={{ background:DIFF_COL[challenge.difficulty]+"18", color:DIFF_COL[challenge.difficulty], padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700 }}>
              {DIFF_LABEL[challenge.difficulty]} · {challenge.difficulty*100} pts
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="card" style={{ marginBottom:10 }}>
        <div className="card-title">Mission Brief</div>
        <div style={{ fontSize:13, color:"var(--text-1)", lineHeight:1.75, marginBottom:14 }}>
          {challenge.description}
        </div>

        {/* Image challenge */}
        {challenge.imageFull && (
          <div style={{ marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:11, color:"var(--text-label)", fontWeight:700, textTransform:"uppercase", letterSpacing:".5px" }}>Attached File</span>
              <div style={{ display:"flex", gap:6 }}>
                <button className="btn btn-ghost btn-sm" onClick={()=>setImgExpanded(v=>!v)}>
                  {imgExpanded?"Hide":"Preview"} image
                </button>
                <a className="file-chip"
                  href={`data:image/png;base64,${challenge.imageFull}`}
                  download={`${challenge.id}_challenge.png`}>
                  ⬇ challenge.png
                </a>
              </div>
            </div>
            {imgExpanded && (
              <div style={{ background:"var(--bg-output)", border:"1px solid var(--border)", borderRadius:8, padding:12, display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
                <img src={`data:image/png;base64,${challenge.imageFull}`} alt="Challenge"
                  style={{ maxWidth:200, maxHeight:200, imageRendering:"pixelated", borderRadius:4, border:"1px solid var(--border)" }} />
                <div style={{ fontSize:12, color:"var(--text-2)", lineHeight:1.7 }}>
                  <div style={{ marginBottom:6, color:"var(--text-label)", fontWeight:700, fontSize:10, textTransform:"uppercase" }}>Analysis Tips</div>
                  Download the PNG file. Image files can contain hidden data in their pixel values, metadata, or file structure.
                  The visual appearance may give no indication of what's hidden.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ciphertext / data */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <span style={{ fontSize:10.5, color:"var(--text-label)", fontWeight:700, textTransform:"uppercase", letterSpacing:".5px" }}>
              {challenge.imageFull ? "Instructions / Notes" : "Data"}
            </span>
            <CopyBtn text={challenge.ciphertext} />
          </div>
          <div className="ctf-terminal">{challenge.ciphertext}</div>
        </div>
      </div>

      {/* Hints — NO tool names, just crypto concepts */}
      <div className="card" style={{ marginBottom:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--text-label)", textTransform:"uppercase", letterSpacing:".5px" }}>
            Intel ({hintsUsed}/{challenge.hints.length} revealed · −25 pts each)
          </div>
          {hintsUsed < challenge.hints.length && !solved && (
            <button className="btn btn-ghost btn-sm" onClick={onUseHint} style={{ fontSize:11, color:"var(--yellow)", borderColor:"var(--yellow)44" }}>
              ⚡ Reveal intel
            </button>
          )}
        </div>
        {hintsUsed===0&&<div style={{ color:"var(--text-3)", fontSize:12 }}>No intel revealed. Attempt the challenge first.</div>}
        {challenge.hints.slice(0,hintsUsed).map((hint,i)=>(
          <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 10px",
            background:"var(--bg-output)", borderRadius:6, marginBottom:6, fontSize:12, color:"var(--text-1)", lineHeight:1.6 }}>
            <span style={{ color:"var(--yellow)", fontWeight:700, flexShrink:0, fontFamily:"monospace" }}>#{i+1}</span>
            <span>{hint}</span>
          </div>
        ))}
      </div>

      {/* Submit */}
      {!solved ? (
        <div className="card" style={{ marginBottom:10 }}>
          <div className="card-title">Submit Flag</div>
          <div style={{ display:"flex", gap:8 }}>
            <input value={answer} onChange={e=>setAnswer(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&tryAnswer()}
              placeholder="flag{...}"
              style={{ flex:1, fontFamily:"monospace", border:`1px solid ${wrong?"var(--red)":"var(--border)"}`, transition:".15s" }} />
            <button className="btn btn-primary" onClick={tryAnswer}
              style={{ background:wrong?"#7f1d1d":undefined, transition:".15s" }}>
              {wrong?"✗ Wrong":"Submit →"}
            </button>
          </div>
          {wrong&&<div style={{ fontSize:12, color:"var(--red)", marginTop:6 }}>Incorrect. Check your decoding — expected format is flag&#123;…&#125;.</div>}
          <div style={{ fontSize:11, color:"var(--text-3)", marginTop:7 }}>
            Score if solved now: <b style={{ color:"var(--text-1)" }}>{pts} pts</b>
            {hintsUsed>0&&<span style={{ color:"var(--text-3)" }}> (−{hintsUsed*25} for {hintsUsed} intel)</span>}
          </div>
        </div>
      ) : (
        <div className="ctf-solved-banner" style={{ marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontWeight:800, color:"var(--green)", fontSize:17, marginBottom:4 }}>✅ Flag Captured! +{pts} pts</div>
              <div style={{ fontSize:12, color:"var(--text-2)" }}>
                Flag: <span style={{ fontFamily:"monospace", color:"var(--green)" }}>{challenge.flag}</span>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShowExplan(v=>!v)}>
              {showExplan?"Hide":"Show"} writeup
            </button>
          </div>
          {showExplan&&(
            <div style={{ marginTop:12, background:"var(--bg-output)", border:"1px solid var(--border)", borderRadius:6, padding:"10px 12px", fontSize:12, color:"var(--text-1)", lineHeight:1.7 }}>
              <b style={{ color:"var(--accent)" }}>Technical Explanation:</b><br/>{challenge.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main View ──────────────────────────────────────────────────────────────────
export default function CTFChallengeView({ addHistory }) {
  const [solved, setSolved]     = useState({});
  const [hintMap, setHintMap]   = useState({});
  const [activeId, setActiveId] = useState(null);
  const [catFilter, setCatFilter] = useState("all");
  const [diffFilter, setDiffFilter] = useState("all");
  const [startTime, setStartTime] = useState(null);
  const [timerOn, setTimerOn] = useState(false);

  const filtered = CHALLENGES.filter(c=>{
    if(catFilter!=="all"&&c.category!==catFilter)return false;
    if(diffFilter!=="all"&&c.difficulty!==Number(diffFilter))return false;
    return true;
  });

  const activeChallenge = activeId ? CHALLENGES.find(c=>c.id===activeId) : null;

  const handleSolve = (id, hints) => {
    setSolved(s=>({...s,[id]:true}));
    const ch=CHALLENGES.find(c=>c.id===id);
    const pts=Math.max(0,ch.difficulty*100-hints*25);
    addHistory?.("CTF Solve",ch.title,`+${pts} pts`);
  };
  const handleHint = () => {
    if(!activeId)return;
    const ch=CHALLENGES.find(c=>c.id===activeId);
    const used=hintMap[activeId]||0;
    if(used<ch.hints.length)setHintMap(h=>({...h,[activeId]:used+1}));
  };

  const toggleTimer = () => {
    if(!timerOn){setStartTime(Date.now());setTimerOn(true);}
    else{setStartTime(null);setTimerOn(false);}
  };

  if(activeChallenge) return (
    <div>
      <div className="section-header"><h3>🏁 CTF Challenge Mode</h3><p>Analyze the data and capture the flag.</p></div>
      <ActiveChallenge challenge={activeChallenge} solved={!!solved[activeId]} onSolve={handleSolve}
        onBack={()=>setActiveId(null)} hintsUsed={hintMap[activeId]||0} onUseHint={handleHint} />
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div>
          <h3 style={{ fontSize:15, fontWeight:600, color:"var(--text-1)" }}>🏁 CTF Challenge Mode</h3>
          <p style={{ fontSize:12, color:"var(--text-2)", marginTop:3 }}>
            {CHALLENGES.length} challenges · {Object.keys(solved).length} solved · Capture the flags
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={toggleTimer}
          style={{ borderColor:timerOn?"var(--accent)":"var(--border)", color:timerOn?"var(--accent)":"var(--text-2)" }}>
          {timerOn?"⏹ Stop timer":"⏱ Start timer"}
        </button>
      </div>

      <Scoreboard solved={solved} hintMap={hintMap} startTime={timerOn?startTime:null} />

      {/* Filters */}
      <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{ width:"auto", fontSize:12, height:30, padding:"0 8px" }}>
          <option value="all">All categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={diffFilter} onChange={e=>setDiffFilter(e.target.value)} style={{ width:"auto", fontSize:12, height:30, padding:"0 8px" }}>
          <option value="all">All difficulties</option>
          <option value="1">🟢 Beginner</option>
          <option value="2">🟡 Intermediate</option>
          <option value="3">🔴 Advanced</option>
        </select>
        <div style={{ marginLeft:"auto", fontSize:11, color:"var(--text-3)", alignSelf:"center" }}>
          {filtered.length} challenges shown · {filtered.filter(c=>solved[c.id]).length} solved
        </div>
      </div>

      {/* Challenge list */}
      {filtered.map(ch=>(
        <ChallengeCard key={ch.id} challenge={ch} solved={!!solved[ch.id]} onSelect={setActiveId} />
      ))}
      {filtered.length===0&&<div className="empty">No challenges match the current filters.</div>}
    </div>
  );
}
