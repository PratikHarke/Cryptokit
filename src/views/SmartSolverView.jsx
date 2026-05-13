import { useState, useRef, useCallback, useEffect } from "react";
import { autoSolve }        from "../crypto/autoSolver.js";
import { aggressiveSolve }  from "../crypto/aggressiveSolver.js";
import { detect }           from "../crypto/detector.js";
import { scoreBreakdown }   from "../crypto/scorer.js";
import { CopyBtn }          from "../components/Output.jsx";
import { appendSolverHistory } from "../lib/workspace.js";
import {
  buildSuggestions,
  assessConfidenceVerdict,
  assessFlagConfidence,
  buildPipelinePreview,
  previewToPipelineOps,
  getStepReason,
  getHint,
  getFailureAdvice,
  TRANSFORM_EXPLANATIONS,
} from "../crypto/assistEngine.js";

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_FLAG_RE = /(flag|ctf|ovrd|hack|htb|picoctf|pico)\{[^}]+\}/i;
const MAX_DEPTH    = 5;
const TIMEOUT_MS   = 5000;
const MAX_INPUT_BYTES = 50_000; // 50 KB — prevents UI freeze on massive paste

const CAT_COLOR = {
  Encoding:"#00d4ff", Classical:"#a78bfa", XOR:"#ffd700",
  "Web Crypto":"#34d399","Encrypted/Compressed":"#ff3d5a",
  "RSA/PKI":"#f472b6", Hash:"#fb923c","CTF Pattern":"#00e87a", Info:"#5a8ab0",
};
const confColor = c => c>=80?"var(--green)":c>=55?"var(--yellow)":"var(--orange)";
const confLabel = c => c>=80?"High":c>=55?"Medium":"Low";
const confTagClass = c => c>=80?"tag tag-high":c>=55?"tag tag-med":"tag tag-low";

// ── Rotating scan messages ────────────────────────────────────────────────────
const SCAN_MESSAGES = [
  "Analyzing patterns…",
  "Testing transformations…",
  "Evaluating candidates…",
  "Checking encoding layers…",
  "Scoring outputs…",
  "Running beam search…",
  "Detecting flag patterns…",
];
function useRotatingMessage(active, interval = 850) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setIdx(i => (i + 1) % SCAN_MESSAGES.length), interval);
    return () => clearInterval(id);
  }, [active, interval]);
  return SCAN_MESSAGES[idx];
}

// ── Scan status bar with spinner + rotating messages ─────────────────────────
function ScanStatusBar({ depth, maxDepth, stepInfo }) {
  const msg = useRotatingMessage(true);
  const trying = stepInfo?.trying?.[0];
  return (
    <div className="scan-status" style={{ marginBottom:12, flexDirection:"column", gap:6 }}>
      {/* Row 1: spinner + current chain */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span className="spinner" />
        <span className="scan-status-text" style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {trying ? `Trying: ${trying}` : msg}
        </span>
        <span style={{ fontSize:10, color:"var(--accent)", fontFamily:"var(--font-mono)", flexShrink:0 }}>
          depth {stepInfo?.depth ?? depth}/{maxDepth}
        </span>
        <div style={{ width:80, height:3, background:"var(--bg-hover)", borderRadius:2, overflow:"hidden", flexShrink:0 }}>
          <div className="progress-scan" style={{ height:"100%", borderRadius:2 }} />
        </div>
      </div>
      {/* Row 2: solver stats (only when stepInfo has detail) */}
      {stepInfo?.candidates !== undefined && (
        <div style={{ display:"flex", gap:12, paddingLeft:24, fontSize:10, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>
          <span>Exploring: <span style={{ color:"var(--text-2)" }}>{stepInfo.candidates} candidates</span></span>
          {stepInfo.bestScore > 0 && (
            <span>Best score: <span style={{ color:"var(--green)" }}>{stepInfo.bestScore}%</span></span>
          )}
          <span>Pruned: <span style={{ color:"var(--text-2)" }}>{stepInfo.pruned ?? 0}</span></span>
        </div>
      )}
    </div>
  );
}

// ── Flag helpers ──────────────────────────────────────────────────────────────
/** Extract ALL flag matches from text */
function detectAllFlags(text, re) {
  if (!text || !re) return [];
  const flags = [];
  let match;
  const localRe = new RegExp(re.source, "gi");
  while ((match = localRe.exec(text)) !== null) flags.push(match[0]);
  return [...new Set(flags)];
}
const detectFlag = (text, re) => detectAllFlags(text, re)[0] ?? null;

// ── Pipeline label → tool map ─────────────────────────────────────────────────
const LABEL_TO_PIPELINE_TOOL = {
  "base64":   "base64.decode",
  "hex":      "hex.decode",
  "url":      "url.decode",
  "binary":   "binary.decode",
  "rot-13":   "caesar.rot13",
  "rot13":    "caesar.rot13",
  "reverse":  "text.reverse",
  "caesar":   "caesar.unshift",
  "morse":    null,
  "vigenère": null,
  "xor":      null,
};

function labelToPipelineTool(label) {
  const lc = (label ?? "").toLowerCase();
  for (const [key, tool] of Object.entries(LABEL_TO_PIPELINE_TOOL)) {
    if (lc.includes(key)) return tool;
  }
  return null;
}

function stepsToPipelineOps(stepsWithIds) {
  return (stepsWithIds ?? [])
    .map(s => {
      const tool = s.toolId?.includes(".") ? s.toolId : labelToPipelineTool(s.label);
      return tool ? { tool, param: s.params ? JSON.stringify(s.params) : undefined } : null;
    })
    .filter(Boolean);
}

// ── Next step suggestion ──────────────────────────────────────────────────────
const NEXT_STEP_MAP = [
  ["base64",  "Run Base64 decode → paste output back into Quick Scan for further layers"],
  ["hex",     "Convert Hex → ASCII — check for nested encoding in the result"],
  ["url",     "URL-decode the input — result may contain another encoding"],
  ["morse",   "Decode Morse code — spaces = letters, / = words"],
  ["rot-13",  "Apply ROT-13 — it's symmetric, decode = encode"],
  ["rot13",   "Apply ROT-13 — it's symmetric, decode = encode"],
  ["caesar",  "Try Caesar Brute Force with all 26 shifts (Cryptanalysis → Caesar BF)"],
  ["binary",  "Convert binary groups of 8 bits to ASCII"],
  ["xor",     "Try single-byte XOR brute force in XOR Analyzer → Brute Force tab"],
  ["vigenère","Analyse key length with Kasiski/IC (Cryptanalysis → Vigenère Crack)"],
  ["vigenere","Analyse key length with Kasiski/IC (Cryptanalysis → Vigenère Crack)"],
  ["rsa",     "Extract n, e, c values and try Fermat or Wiener attack (RSA Attacks)"],
  ["hash",    "Identify hash type then run a dictionary attack (Hash Analyzer)"],
  ["jwt",     "Inspect JWT claims and try alg:none attack (JWT Inspector)"],
];
function nextStep(label) {
  const lc = (label ?? "").toLowerCase();
  for (const [key, s] of NEXT_STEP_MAP) if (lc.includes(key)) return s;
  return "Paste output back into Quick Scan to detect additional encoding layers.";
}

// ── Human-readable reason ─────────────────────────────────────────────────────
function buildReason(sr, label, output) {
  const r = [];
  if (sr.printableRatio >= 0.95) r.push("fully printable ASCII output");
  else if (sr.printableRatio >= 0.75) r.push("high printable ASCII ratio");
  else if (sr.printableRatio < 0.4) r.push("many non-printable bytes (penalty applied)");
  if (sr.wordScore >= 60) r.push("contains common English words");
  else if (sr.wordScore >= 30) r.push("some English word matches");
  if (sr.chiScore >= 70) r.push("letter frequency close to English");
  if (sr.icScore >= 70) r.push("IC near English target (0.067)");
  if (sr.entropyDelta > 0.5) r.push(`entropy dropped ${sr.entropyDelta.toFixed(2)} bits`);
  if (sr.hasFlag) r.push("matches CTF flag pattern — score boosted");
  if (label?.toLowerCase().includes("base64") && /^[A-Za-z0-9+/]+=*$/.test((output??"")))
    r.push("valid Base64 alphabet with correct padding");
  if (r.length === 0) r.push("pattern matched detection heuristics");
  return r;
}

// ── Flag banner (multi-flag) ──────────────────────────────────────────────────
function FlagCopyBtn({ text }) {
  const [st, setSt] = useState("idle");
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setSt("copied"); setTimeout(()=>setSt("idle"),1800); });
  };
  return (
    <button className={`flag-copy-btn${st==="copied"?" copied":""}`} onClick={copy}>
      {st==="copied" ? "✓ Copied!" : "Copy"}
    </button>
  );
}

function FlagBanner({ flags, autoCopy, onAutoCopyToggle, flagRe }) {
  const [copiedAll, setCopiedAll] = useState(false);
  const copyAll = () => {
    navigator.clipboard.writeText(flags.join("\n")).then(() => {
      setCopiedAll(true); setTimeout(() => setCopiedAll(false), 2000);
    });
  };
  if (!flags.length) return null;

  const CONF_COLOR = { HIGH:"var(--success-text)", MEDIUM:"var(--medium-text)", LOW:"var(--low-text)" };
  const CONF_BG    = { HIGH:"var(--success-bg)",   MEDIUM:"var(--medium-bg)",   LOW:"var(--low-bg)" };

  return (
    <div id="flag-banner" className="flag-banner">
      <div className="flag-banner-header">
        🏁 {flags.length > 1 ? `${flags.length} FLAGS FOUND` : "FLAG FOUND"}
        <span style={{ flex:1 }} />
        {onAutoCopyToggle && (
          <label style={{ fontSize:10, color:"var(--success-text)", display:"flex", gap:4, alignItems:"center", cursor:"pointer", fontWeight:400 }}>
            <input type="checkbox" checked={autoCopy} onChange={onAutoCopyToggle} />
            Auto-copy
          </label>
        )}
        {flags.length > 1 && (
          <button className={`flag-copy-btn${copiedAll?" copied":""}`} onClick={copyAll}>
            {copiedAll ? "✓ All Copied!" : "Copy All"}
          </button>
        )}
      </div>
      {flags.map((f, i) => {
        const fc = assessFlagConfidence(f, flagRe);
        return (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            background:"var(--success-bg)", borderRadius:5, padding:"6px 10px",
            marginBottom: i < flags.length-1 ? 6 : 0 }}>
            <code style={{ fontSize:13, color:"var(--success-text)", fontWeight:700, wordBreak:"break-all", flex:1 }}>{f}</code>
            <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0, marginLeft:8 }}>
              {/* Flag confidence badge */}
              <span style={{ fontSize:9, fontWeight:700, borderRadius:3, padding:"1px 6px",
                color: CONF_COLOR[fc.level], background: CONF_BG[fc.level],
                border:`1px solid ${CONF_COLOR[fc.level]}44`,
                cursor:"default", fontFamily:"var(--font-mono)" }}
                data-tooltip={fc.detail}>
                🏁 {fc.level}
              </span>
              <FlagCopyBtn text={f} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── "Apply to Pipeline" button ────────────────────────────────────────────────
function PipelineBtn({ label, stepsWithIds, output, onSendToPipeline, input }) {
  const [toasted, setToasted] = useState(false);
  const tool = labelToPipelineTool(label);
  const ops  = stepsWithIds ? stepsToPipelineOps(stepsWithIds) : (tool ? [{ tool }] : null);
  if (!ops?.length) return null;
  const handle = () => {
    onSendToPipeline?.(ops, input);
    setToasted(true);
    setTimeout(() => setToasted(false), 2000);
  };
  return (
    <button className="pipeline-btn"
      data-tooltip={`Send ${ops.length} step${ops.length>1?"s":""} to Manual Pipeline`}
      onClick={handle}>
      {toasted ? `✓ Added ${ops.length} step${ops.length>1?"s":""}` : "➕ Apply to Pipeline"}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ASSIST MODE COMPONENTS
// ────────────────────────────────────────────────────────────────────────────

// ── Confidence verdict panel ───────────────────────────────────────────────
function ConfidenceVerdict({ conf }) {
  const v = assessConfidenceVerdict(conf);
  const bgMap = { "✅":"var(--success-bg)", "🟢":"var(--success-bg)", "🟡":"var(--medium-bg)", "🟠":"var(--low-bg)", "🔴":"var(--low-bg)" };
  const txMap = { "✅":"var(--success-text)", "🟢":"var(--success-text)", "🟡":"var(--medium-text)", "🟠":"var(--low-text)", "🔴":"var(--low-text)" };
  return (
    <div style={{ background:bgMap[v.icon], borderRadius:5, padding:"6px 10px", marginBottom:8,
      border:`1px solid ${txMap[v.icon]}44` }}>
      <div style={{ fontSize:11, fontWeight:700, color:txMap[v.icon], marginBottom:2 }}>
        {v.icon} {v.verdict}
      </div>
      <div style={{ fontSize:10, color:"var(--text-2)" }}>{v.detail}</div>
    </div>
  );
}

// ── Next-step suggestion cards ─────────────────────────────────────────────
function AssistPanel({ output, sr, label, flagRe, onSendToPipeline, input, triedOps }) {
  const suggestions = buildSuggestions(output, sr, label, flagRe, triedOps ?? new Set());
  if (!suggestions.length) return null;

  const tierColor = t => t === "High" ? "var(--success-text)" : t === "Medium" ? "var(--medium-text)" : "var(--low-text)";
  const tierBg    = t => t === "High" ? "var(--success-bg)"   : t === "Medium" ? "var(--medium-bg)"   : "var(--low-bg)";

  return (
    <div style={{ marginTop:8 }}>
      <div style={{ fontSize:9, color:"var(--text-3)", fontFamily:"var(--font-mono)",
        marginBottom:4, fontStyle:"italic" }}>
        Suggestions are heuristic — verify before applying
      </div>
      {suggestions.map((s, i) => (
        <div key={i} style={{
          background:"var(--accent-dim)", border:"1px solid var(--accent)44",
          borderLeft:"3px solid var(--accent)", borderRadius:6,
          padding:"8px 12px", marginBottom:6,
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--accent)", marginBottom:3 }}>
                💡 Suggested next step
              </div>
              <div style={{ fontSize:12, color:"var(--text-1)", fontWeight:600, marginBottom:4 }}>
                {s.action}
              </div>
              <div style={{ fontSize:10, color:"var(--text-2)", lineHeight:1.5 }}>
                <span style={{ color:"var(--text-3)" }}>Why: </span>{s.why}
              </div>
              {s.toolRoute && (
                <div style={{ marginTop:4, fontSize:10, color:"var(--accent)", fontFamily:"var(--font-mono)" }}>
                  → {s.toolRoute}
                </div>
              )}
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
              {/* Confidence tier badge */}
              <span style={{
                fontSize:9, fontWeight:700, borderRadius:3, padding:"1px 6px",
                color: tierColor(s.tier), background: tierBg(s.tier),
                border: `1px solid ${tierColor(s.tier)}44`,
              }}>{s.tier}</span>
              <span style={{ fontSize:9, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>{s.confidence}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Learn Mode explanation box ──────────────────────────────────────────────
function ExplainBox({ label }) {
  const lc = (label ?? "").toLowerCase();
  let entry = null;
  for (const [key, val] of Object.entries(TRANSFORM_EXPLANATIONS)) {
    if (lc.includes(key)) { entry = val; break; }
  }
  if (!entry) return null;
  return (
    <div style={{ background:"var(--bg-card-2)", border:"1px solid var(--border-sub)",
      borderRadius:6, padding:"10px 12px", marginBottom:8, marginTop:4 }}>
      <div style={{ fontSize:10, color:"var(--accent)", fontWeight:700, letterSpacing:.5,
        textTransform:"uppercase", marginBottom:6 }}>
        📖 Learn Mode — {entry.what}
      </div>
      <div style={{ display:"grid", gap:6 }}>
        <div>
          <span style={{ fontSize:10, color:"var(--text-3)", fontWeight:600 }}>How it works: </span>
          <span style={{ fontSize:11, color:"var(--text-1)" }}>{entry.why}</span>
        </div>
        <div>
          <span style={{ fontSize:10, color:"var(--text-3)", fontWeight:600 }}>Detection signals: </span>
          <span style={{ fontSize:11, color:"var(--text-2)" }}>{entry.signal}</span>
        </div>
        <div>
          <span style={{ fontSize:10, color:"var(--text-3)", fontWeight:600 }}>CTF note: </span>
          <span style={{ fontSize:11, color:"var(--text-2)" }}>{entry.ctf}</span>
        </div>
      </div>
    </div>
  );
}

// ── Pipeline auto-build preview panel ─────────────────────────────────────
function PipelinePreviewPanel({ result, onSendToPipeline, input }) {
  const [open, setOpen]   = useState(false);
  const [sent, setSent]   = useState(false);
  const preview = buildPipelinePreview(result);
  if (preview.length < 2) return null; // Only useful for multi-step

  const ops = previewToPipelineOps(preview);
  const allSupported = preview.every(s => s.canAutoApply);

  const apply = () => {
    if (!ops.length) return;
    onSendToPipeline?.(ops, input);
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <div style={{ marginTop:8, marginBottom:4 }}>
      <button onClick={() => setOpen(o=>!o)}
        style={{ background:"none", border:"none", color:"var(--accent)", cursor:"pointer",
          fontSize:11, padding:0, textDecoration:"underline", marginBottom: open ? 8 : 0 }}>
        {open ? "▴ Hide pipeline preview" : "▾ 🔧 Auto-build Pipeline — preview before applying"}
      </button>
      {open && (
        <div style={{ background:"var(--bg-card-2)", border:"1px solid var(--border)",
          borderRadius:6, padding:"10px 12px" }}>
          <div style={{ fontSize:11, color:"var(--text-2)", marginBottom:8 }}>
            This chain will be added to Manual Pipeline:
          </div>
          {/* Step flow diagram */}
          <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:4, marginBottom:10 }}>
            <div style={{ fontSize:10, color:"var(--text-3)", background:"var(--bg-hover)",
              border:"1px solid var(--border)", borderRadius:3, padding:"2px 8px" }}>
              Input
            </div>
            {preview.map((step, i) => {
              const reason = getStepReason(step.opId);
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ color:"var(--text-3)", fontSize:10 }}>▶</span>
                  <div style={{ position:"relative" }}>
                    <div style={{
                      fontSize:10, fontWeight:600,
                      color: step.canAutoApply ? "var(--text-1)" : "var(--text-3)",
                      background: step.canAutoApply ? "var(--accent-dim)" : "var(--bg-hover)",
                      border:`1px solid ${step.canAutoApply ? "var(--accent)44" : "var(--border)"}`,
                      borderRadius:3, padding:"2px 8px",
                      opacity: step.canAutoApply ? 1 : 0.7,
                    }}
                      data-tooltip={reason ?? (step.canAutoApply ? "Auto-applicable step" : "Requires manual configuration")}
                    >
                      {step.label}
                      {!step.canAutoApply && <span style={{ fontSize:8, color:"var(--orange)", marginLeft:4 }}>⚠ manual</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ color:"var(--text-3)", fontSize:10 }}>▶</span>
              <div style={{ fontSize:10, color:"var(--green)", background:"var(--success-bg)",
                border:"1px solid var(--success-text)44", borderRadius:3, padding:"2px 8px", fontWeight:600 }}>
                Output
              </div>
            </div>
          </div>
          {!allSupported && (
            <div style={{ fontSize:10, color:"var(--orange)", marginBottom:8 }}>
              ⚠ Steps marked "manual" require configuration in Pipeline (e.g. XOR key, Caesar shift).
            </div>
          )}
          <button
            onClick={apply}
            disabled={!ops.length}
            style={{ background: sent ? "var(--success-bg)" : "var(--accent-dim)",
              border:`1px solid ${sent ? "var(--success-text)" : "var(--accent)"}`,
              color: sent ? "var(--success-text)" : "var(--accent)",
              borderRadius:5, padding:"5px 14px", cursor:ops.length?"pointer":"not-allowed",
              fontSize:11, fontWeight:700, transition:".15s" }}>
            {sent ? "✓ Added to Pipeline!" : `➕ Apply ${ops.length} step${ops.length!==1?"s":""} to Pipeline`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── CTF Hint banner ────────────────────────────────────────────────────────
function HintBanner({ input, results }) {
  const [dismissed, setDismissed] = useState(false);
  const hint = getHint(input, results);
  if (!hint || dismissed) return null;
  return (
    <div style={{ background:"var(--medium-bg)", border:"1px solid var(--medium-text)44",
      borderLeft:"3px solid var(--yellow)", borderRadius:6,
      padding:"10px 14px", marginBottom:12, position:"relative" }}>
      <button onClick={() => setDismissed(true)}
        style={{ position:"absolute", top:6, right:8, background:"none", border:"none",
          color:"var(--text-3)", cursor:"pointer", fontSize:14, lineHeight:1 }}>×</button>
      <div style={{ fontSize:11, fontWeight:700, color:"var(--medium-text)", marginBottom:4 }}>
        🧭 Hint: {hint.title}
      </div>
      <div style={{ fontSize:11, color:"var(--text-1)", marginBottom:6, lineHeight:1.5 }}>
        {hint.body}
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
        {hint.suggestions.map((s,i) => (
          <span key={i} style={{ fontSize:10, background:"var(--bg-hover)",
            border:"1px solid var(--border)", borderRadius:3, padding:"2px 8px",
            color:"var(--text-1)" }}>→ {s}</span>
        ))}
      </div>
    </div>
  );
}

// ── Failure advice panel ───────────────────────────────────────────────────
function FailurePanel({ input, results }) {
  const advice = getFailureAdvice(input, results);
  return (
    <div style={{ background:"var(--bg-card-2)", border:"1px solid var(--border)",
      borderRadius:6, padding:"14px 16px", marginBottom:12 }}>
      <div style={{ fontSize:12, fontWeight:700, color:"var(--text-1)", marginBottom:6 }}>
        ⚠ No high-confidence decode found
      </div>
      <div style={{ fontSize:11, color:"var(--text-2)", marginBottom:10, lineHeight:1.5 }}>
        {advice.reason}
      </div>
      <div style={{ fontSize:11, color:"var(--text-3)", fontWeight:600, marginBottom:6 }}>
        Try these tools:
      </div>
      {advice.tools.map((tool, i) => (
        <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start",
          padding:"6px 0", borderTop: i>0 ? "1px solid var(--border-sub)" : "none" }}>
          <div style={{ minWidth:6, height:6, borderRadius:"50%", background:"var(--accent)",
            marginTop:4, flexShrink:0 }} />
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--accent)" }}>{tool.name}</div>
            <div style={{ fontSize:10, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>{tool.route}</div>
            <div style={{ fontSize:10, color:"var(--text-2)", marginTop:2 }}>{tool.why}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
function ResultCard({ r, rank, flagRe, onSendToPipeline, input, autoCopy, setAutoCopy, assistMode, explainMode, triedOps }) {
  const [expanded, setExpanded] = useState(false);
  const flags = detectAllFlags(r.output ?? "", flagRe);
  const sr    = r.scoreReport ?? scoreBreakdown(r.output ?? "");
  const conf  = r.confidence ?? sr.confidence ?? 0;
  const col   = confColor(conf);
  const isTop = rank === 0;
  const reasons = buildReason(sr, r.label ?? r.steps?.[0], r.output);
  const ns = nextStep(r.label ?? r.steps?.[r.steps?.length-1] ?? "");
  const label = r.steps?.join(" → ") || r.label || "";

  // P4: A result is only "best" if it has a flag OR confidence ≥ 70
  const hasFlag = flags.length > 0;
  const isHighConf = conf >= 70;
  const isLowConf = conf < 70 && !hasFlag;
  // Low-confidence results never get green border or BEST CANDIDATE badge
  const cardBorderCol = hasFlag ? "var(--green)"
    : isTop && isHighConf ? "var(--green)"
    : isTop ? "var(--yellow)"   // top but low-conf → amber border
    : col;
  const cardClass = isTop && isHighConf
    ? "card card-lift result-card-best"
    : isTop
    ? "card card-lift"          // no green class for low-conf top result
    : "card card-lift result-card-other";

  // Auto-copy: fires once when rank-0 flag result is first rendered
  const autoCopiedRef = useRef(false);
  if (isTop && autoCopy && hasFlag && !autoCopiedRef.current) {
    autoCopiedRef.current = true;
    navigator.clipboard.writeText(flags[0]).catch(() => {});
  }

  return (
    <div className={cardClass}
      style={{ marginBottom:12,
        borderLeft:`4px solid ${cardBorderCol}`,
        position:"relative",
      }}>
      {/* BEST CANDIDATE badge — only when actually high-confidence */}
      {isTop && isHighConf && !isLowConf && (
        <div style={{ position:"absolute", top:-1, right:12,
          background:"var(--green)", color:"#000", fontSize:9,
          padding:"2px 8px", borderRadius:"0 0 5px 5px", fontWeight:700, letterSpacing:1 }}>
          ★ BEST CANDIDATE
        </div>
      )}
      {/* Low-confidence warning — replaces the BEST CANDIDATE badge */}
      {isTop && isLowConf && (
        <div style={{ position:"absolute", top:-1, right:12,
          background:"var(--medium-bg)", color:"var(--medium-text)", fontSize:9,
          padding:"2px 8px", borderRadius:"0 0 5px 5px", fontWeight:700, letterSpacing:.5,
          border:`1px solid var(--medium-text)44` }}>
          ⚠ LOW CONFIDENCE
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          {flags.length > 0 && (
            <span style={{ fontSize:9, background:"var(--green)", color:"#000",
              padding:"1px 6px", borderRadius:3, fontWeight:700 }}>🏁 FLAG×{flags.length}</span>
          )}
          {/* Confidence label — High / Medium / Low */}
          <span className={confTagClass(conf)}>{confLabel(conf)}</span>
          {r.category && (
            <span style={{ fontSize:9, color:CAT_COLOR[r.category]||col,
              textTransform:"uppercase", letterSpacing:1, fontWeight:700 }}>{r.category}</span>
          )}
          <span style={{ fontWeight:600, color:"var(--text-1)", fontSize:12 }}>{label}</span>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0, marginLeft:8 }}>
          <div style={{ textAlign:"right" }}>
            {/* Use var(--text-1) for percentage — col used only on progress bar */}
            <div style={{ fontSize:13, fontWeight:700, color:"var(--text-1)", fontFamily:"var(--font-mono)" }}>{conf}%</div>
            <div style={{ fontSize:9, color:"var(--text-2)" }}>{sr.grade}</div>
          </div>
          <CopyBtn text={r.output} />
        </div>
      </div>

      {/* Confidence bar + verdict subtitle */}
      <div style={{ marginBottom:8 }}>
        <div style={{ height:3, background:"var(--bg-hover)", borderRadius:2, overflow:"hidden" }}>
          <div style={{ width:`${conf}%`, height:"100%", background:col, borderRadius:2, transition:"width .3s" }} />
        </div>
        <div className="conf-bar-verdict">{assessConfidenceVerdict(conf).verdict}</div>
        <div style={{ fontSize:9, color:"var(--text-3)", fontFamily:"var(--font-mono)",
          marginTop:1, fontStyle:"italic", letterSpacing:.2 }}>
          Confidence is heuristic, not cryptographic proof
        </div>
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <FlagBanner flags={flags}
          autoCopy={isTop && autoCopy}
          onAutoCopyToggle={isTop && setAutoCopy ? () => setAutoCopy(v=>!v) : undefined} />
      )}

      {/* Output */}
      <pre style={{ background:"var(--bg-output)", padding:8, borderRadius:4, fontSize:12,
        color:"var(--output-col)", overflow:"auto", maxHeight:100, whiteSpace:"pre-wrap",
        wordBreak:"break-all", margin:"0 0 8px" }}>{r.output}</pre>

      {/* Reason — with score drivers */}
      <div style={{ fontSize:11, color:"var(--text-2)", marginBottom:6, display:"flex", flexWrap:"wrap", gap:4, alignItems:"center" }}>
        <span style={{ color:"var(--text-3)" }}>ℹ Why: </span>
        {reasons.map((r, i) => (
          <span key={i} style={{ background:"var(--bg-hover)", border:"1px solid var(--border)",
            borderRadius:3, padding:"1px 6px", fontSize:10, color:"var(--text-1)" }}>{r}</span>
        ))}
      </div>

      {/* Why this works — expandable */}
      <button onClick={() => setExpanded(e=>!e)}
        style={{ background:"none", border:"none", color:"var(--text-3)", cursor:"pointer",
          fontSize:11, padding:0, marginBottom:expanded?8:0, textDecoration:"underline" }}>
        {expanded ? "▴ Hide details" : "▾ Why this works"}
      </button>

      {expanded && (
        <div style={{ background:"var(--bg-card-2)", borderRadius:6, padding:"10px 12px",
          fontSize:11, marginBottom:8 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
            {[
              ["Printable ASCII", `${Math.round(sr.printableRatio*100)}%`],
              ["Word Score",      `${sr.wordScore}%`],
              ["Chi-Squared",     `${sr.chiScore}%`],
              ["IC Score",        `${sr.icScore}%`],
              ["Entropy Δ",       `${sr.entropyDelta?.toFixed(2)??"—"} bits`],
              ["Flag Pattern",    sr.hasFlag?"✓ matched (+25 pts)":"—"],
            ].map(([k,v]) => (
              <div key={k} style={{ background:"var(--bg-hover)", borderRadius:4, padding:"5px 8px" }}>
                <div style={{ color:"var(--text-3)", fontSize:9, textTransform:"uppercase",
                  letterSpacing:.5, marginBottom:2 }}>{k}</div>
                <div style={{ color:"var(--text-1)", fontWeight:600, fontFamily:"var(--font-mono)" }}>{v}</div>
              </div>
            ))}
          </div>
          {r.explanation?.whyKept && (
            <div style={{ marginTop:8, color:"var(--text-2)", fontSize:11 }}>
              <span style={{ color:"var(--text-3)" }}>Solver note: </span>{r.explanation.whyKept}
            </div>
          )}
        </div>
      )}

      {/* Learn Mode: transform explanation */}
      {explainMode && (
        <ExplainBox label={r.label ?? r.steps?.[0] ?? ""} />
      )}

      {/* Assist Mode: confidence verdict + next-step suggestions + pipeline preview */}
      {assistMode && (
        <>
          <ConfidenceVerdict conf={conf} />
          {/* Decay indicator: show when confidence was reduced due to chain depth */}
          {r.decayFactor !== undefined && r.decayFactor < 0.95 && r.rawConfidence !== undefined && (
            <div style={{ fontSize:10, color:"var(--text-3)", fontFamily:"var(--font-mono)",
              marginBottom:6, display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ opacity:.6 }}>⚠</span>
              Raw score {r.rawConfidence}% → adjusted to {conf}% (depth-{r.depth ?? "?"} decay ×{r.decayFactor})
            </div>
          )}
          <AssistPanel
            output={r.output} sr={sr}
            label={r.label ?? r.steps?.[r.steps.length-1] ?? ""}
            flagRe={flagRe}
            onSendToPipeline={onSendToPipeline} input={input}
            triedOps={triedOps ?? new Set()}
          />
          <PipelinePreviewPanel
            result={r} onSendToPipeline={onSendToPipeline} input={input} />
        </>
      )}

      {/* Action row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        borderTop:"1px solid var(--border-sub)", paddingTop:6, marginTop:4, flexWrap:"wrap", gap:6 }}>
        <div style={{ fontSize:11, color:"var(--accent)" }}>
          <span style={{ color:"var(--text-3)" }}>▶ Next: </span>{ns}
        </div>
        <PipelineBtn label={r.label ?? r.steps?.[0]}
          stepsWithIds={r.stepsWithIds}
          output={r.output} input={input}
          onSendToPipeline={onSendToPipeline} />
      </div>
    </div>
  );
}

// ── Quick Scan ────────────────────────────────────────────────────────────────
function QuickScanTab({ addHistory, flagRe, onSendToPipeline, autoCopy, setAutoCopy, assistMode, explainMode, activeWorkspaceId, privateMode }) {
  const [input,    setInput]    = useState("");
  const [results,  setResults]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  // Session memory: track opIds already attempted to suppress redundant suggestions
  const triedOpsRef = useRef(new Set());
  const flagRef = useRef(null);
  const runRef  = useRef(null);

  useEffect(() => { runRef.current = run; });
  // Ctrl+Enter → run from this tab when it's mounted
  useEffect(() => {
    const h = () => runRef.current?.();
    window.addEventListener("ck:run", h);
    return () => window.removeEventListener("ck:run", h);
  }, []);

  const EXAMPLES = [
    { label:"Base64",  val:"ZmxhZ3tiYXNlNjRfaXNfbmljZX0=" },
    { label:"Hex",     val:"666c61677b6865785f69735f636f6f6c7d" },
    { label:"ROT-13",  val:"synt{ebg_guvegrra_jbexf}" },
    { label:"URL",     val:"OVRD%7Burl_decode_test%7D" },
    { label:"Binary",  val:"01100110 01101100 01100001 01100111" },
  ];

  const QUICK_SCAN_TIMEOUT_MS = 5000;

  const run = async () => {
    if (!input.trim()) {
      setResults([{ label:"No input", output:"", confidence:0, category:"Error",
        note:"Enter text to scan." }]);
      return;
    }
    if (new TextEncoder().encode(input).length > MAX_INPUT_BYTES) {
      setResults([{ label:"Input too large", output:"", confidence:0, category:"Error",
        note:`Input exceeds ${MAX_INPUT_BYTES/1000} KB. Truncate and retry.` }]);
      return;
    }
    setLoading(true); setResults(null);
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setResults([{ label:"Timeout", output:"", confidence:0, category:"Error",
        note:"Quick Scan timed out after 5 s. Try a shorter or simpler input." }]);
    }, QUICK_SCAN_TIMEOUT_MS);
    try {
      await new Promise(r => setTimeout(r, 0));
      const raw = await autoSolve(input.trim());
      const enriched = raw.map(r => ({
        ...r,
        scoreReport: scoreBreakdown(r.output ?? "", input),
        stepsWithIds: r.stepsWithIds ?? null,
      })).sort((a, b) => {
        const af = detectFlag(a.output, flagRe) ? 1 : 0;
        const bf = detectFlag(b.output, flagRe) ? 1 : 0;
        if (af !== bf) return bf - af;
        return (b.confidence ?? 0) - (a.confidence ?? 0);
      });
      // Record which opIds were just attempted (for session memory)
      enriched.forEach(r => {
        const op = r.stepsWithIds?.[0]?.toolId ?? r.tool;
        if (op) triedOpsRef.current.add(op);
      });
      setResults(enriched);
      addHistory?.("Quick Scan", input.slice(0,40), enriched[0]?.output?.slice(0,60) ?? "no result");
      // Workspace history (only when private mode OFF)
      if (activeWorkspaceId) {
        appendSolverHistory(activeWorkspaceId, {
          timestamp:     new Date().toISOString(),
          method:        "Quick Scan",
          inputPreview:  input.slice(0, 60),
          outputPreview: enriched[0]?.output?.slice(0, 60) ?? "",
          confidence:    enriched[0]?.confidence ?? 0,
          hasFlag:       enriched.some(r => detectFlag(r.output, flagRe)),
        }, privateMode);
      }
      if (enriched.some(r => detectFlag(r.output, flagRe)))
        setTimeout(() => flagRef.current?.scrollIntoView({ behavior:"smooth", block:"center" }), 100);
    } catch (err) {
      setResults([{ label:"Scan failed", output:"", confidence:0, category:"Error",
        note: err?.message || "Unexpected error during Quick Scan." }]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const topFlags = results?.flatMap(r => detectAllFlags(r.output ?? "", flagRe)).filter((v,i,a)=>a.indexOf(v)===i) ?? [];

  return (
    <div>
      <p style={{ fontSize:12, color:"var(--text-2)", marginBottom:12 }}>
        Single-pass detection across 30+ types. Scored by printable ratio, English words, chi-squared,
        IC, and entropy drop. Flags auto-highlighted with "Apply to Pipeline" shortcuts.
      </p>
      <div className="card" style={{ marginBottom:12 }}>
        <label>Ciphertext / Encoded Input</label>
        <textarea rows={4} value={input} onChange={e=>setInput(e.target.value)}
          placeholder="Paste encoded or encrypted text here…" />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
          {EXAMPLES.map(ex => (
            <button key={ex.label} className="btn btn-ghost btn-sm" onClick={()=>setInput(ex.val)}>{ex.label}</button>
          ))}
          <button className="btn btn-primary" style={{ marginLeft:"auto" }} onClick={run}
            disabled={loading||!input.trim()} data-tooltip="Ctrl+Enter">
            {loading?"⏳ Scanning…":"⚡ Quick Scan"}
          </button>
          <span style={{ fontSize:9, color:"var(--text-3)", fontFamily:"var(--font-mono)",
            alignSelf:"center", marginLeft:4, opacity:.7 }}>Ctrl+Enter</span>
        </div>
      </div>
      <div ref={flagRef}>
        {topFlags.length > 0 && <FlagBanner flags={topFlags} autoCopy={autoCopy}
          onAutoCopyToggle={()=>setAutoCopy(v=>!v)} flagRe={flagRe} />}
      </div>
      {results === null && !loading && (
        <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>
          <div style={{ fontSize:28, marginBottom:10, opacity:.4 }}>🔍</div>
          <div style={{ fontSize:14, color:"var(--text-2)", marginBottom:4 }}>Paste input to start analysis</div>
          <div style={{ fontSize:11 }}>Supports Base64, Hex, ROT-13, URL-encoding, Binary, Morse, and 25+ more</div>
        </div>
      )}
      {results?.length === 0 && (
        <>
          {assistMode && <HintBanner input={input} results={results} />}
          <FailurePanel input={input} results={results} />
        </>
      )}
      {/* Low-confidence results with hint */}
      {results?.length > 0 && assistMode && results.every(r => (r.confidence??0) < 40) && (
        <HintBanner input={input} results={results} />
      )}
      {results?.map((r,i) => (
        <ResultCard key={i} r={r} rank={i} flagRe={flagRe}
          onSendToPipeline={onSendToPipeline} input={input}
          autoCopy={autoCopy} setAutoCopy={i===0?setAutoCopy:null}
          assistMode={assistMode} explainMode={explainMode}
          triedOps={triedOpsRef.current} />
      ))}
    </div>
  );
}

// ── Deep Scan ─────────────────────────────────────────────────────────────────
function DeepScanTab({ addHistory, flagRe, onSendToPipeline, autoCopy, setAutoCopy, assistMode, explainMode, activeWorkspaceId, privateMode }) {
  const [input,    setInput]    = useState("");
  const [results,  setResults]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState(null);
  const [mode,     setMode]     = useState("standard");
  const [statusMsg,setStatusMsg]= useState(null);
  const [stepInfo, setStepInfo] = useState(null);  // { depth, maxDepth, trying[], candidates, bestScore, pruned }
  const abortRef   = useRef(null);
  const flagRef    = useRef(null);
  const triedOpsRef = useRef(new Set());
  const runRef   = useRef(null);

  useEffect(() => { runRef.current = run; });
  useEffect(() => {
    const h = () => runRef.current?.();
    window.addEventListener("ck:run", h);
    return () => window.removeEventListener("ck:run", h);
  }, []);

  const run = async () => {
    if (!input.trim()) {
      setResults([{ label:"No input", output:"", confidence:0, category:"Error",
        note:"Enter text to scan." }]);
      return;
    }
    if (new TextEncoder().encode(input).length > MAX_INPUT_BYTES) {
      setResults([{ label:"Input too large", output:"", confidence:0, category:"Error",
        note:`Input exceeds ${MAX_INPUT_BYTES/1000} KB. Deep Scan requires concise inputs.` }]);
      return;
    }
    setLoading(true); setResults(null); setStatusMsg(null); setStepInfo(null);
    setProgress({ step:0, label:"Initialising…" });
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;
    const timeoutId = setTimeout(() => abortRef.current?.abort(), TIMEOUT_MS);

    try {
      setProgress({ step:1, label:"Running beam search…" });
      const { results: raw, earlyExit, earlyExitReason } =
        await aggressiveSolve(input.trim(), mode, {
          signal, maxDepth: MAX_DEPTH,
          onStep: info => setStepInfo(info),
        });

      if (earlyExit && earlyExitReason) setStatusMsg(earlyExitReason);

      const enriched = (raw ?? []).map(r => ({
        ...r,
        scoreReport: scoreBreakdown(r.output ?? "", input),
      })).sort((a,b) => {
        const af = detectFlag(a.output, flagRe) ? 1 : 0;
        const bf = detectFlag(b.output, flagRe) ? 1 : 0;
        if (af !== bf) return bf - af;
        return (b.confidence ?? 0) - (a.confidence ?? 0);
      });

      setResults(enriched);
      // Record attempted opIds for session memory
      enriched.forEach(r => {
        r.stepsWithIds?.forEach(s => { if (s.toolId) triedOpsRef.current.add(s.toolId); });
      });
      addHistory?.("Deep Scan", input.slice(0,40), enriched[0]?.output?.slice(0,60) ?? "no result");
      if (activeWorkspaceId) {
        appendSolverHistory(activeWorkspaceId, {
          timestamp:     new Date().toISOString(),
          method:        "Deep Scan",
          inputPreview:  input.slice(0, 60),
          outputPreview: enriched[0]?.output?.slice(0, 60) ?? "",
          confidence:    enriched[0]?.confidence ?? 0,
          hasFlag:       enriched.some(r => detectFlag(r.output, flagRe)),
          depth:         enriched[0]?.depth ?? null,
        }, privateMode);
      }
      if (enriched.some(r => detectFlag(r.output, flagRe)))
        setTimeout(() => flagRef.current?.scrollIntoView({ behavior:"smooth", block:"center" }), 100);
    } catch(e) {
      if (e?.name !== "AbortError") setResults([]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setProgress(null);
      setStepInfo(null);
    }
  };

  const stop = () => abortRef.current?.abort();
  const topFlags = results?.flatMap(r=>detectAllFlags(r.output??"",flagRe)).filter((v,i,a)=>a.indexOf(v)===i)??[];

  return (
    <div>
      <p style={{ fontSize:12, color:"var(--text-2)", marginBottom:12 }}>
        Beam-search multi-layer solver (max {MAX_DEPTH} layers, {TIMEOUT_MS/1000}s timeout).
        Stops immediately when a flag with ≥90% confidence is found.
      </p>
      <div className="card" style={{ marginBottom:12 }}>
        <label>Ciphertext / Encoded Input</label>
        <textarea rows={4} value={input} onChange={e=>setInput(e.target.value)}
          placeholder="Paste encoded or encrypted text — handles layered encoding…" />
        <div style={{ display:"flex", gap:8, marginTop:8, alignItems:"center", flexWrap:"wrap" }}>
          <label style={{ fontSize:11, color:"var(--text-2)", margin:0 }}>Mode:</label>
          {[["standard","Standard"],["aggressive","🔥 Aggressive"]].map(([m,l]) => (
            <button key={m} className={`tab${mode===m?" active":""}`}
              style={{ fontSize:11, padding:"4px 12px" }} onClick={()=>setMode(m)}>{l}</button>
          ))}
          <div style={{ marginLeft:"auto", display:"flex", gap:6, alignItems:"center" }}>
            {loading && <button className="btn btn-ghost" onClick={stop} style={{ color:"#f87171" }}>■ Stop</button>}
            <button className="btn btn-primary" onClick={run} disabled={loading||!input.trim()}
              data-tooltip="Ctrl+Enter">
              {loading?"⏳ Scanning…":"🔍 Deep Scan"}
            </button>
            {!loading && <span style={{ fontSize:9, color:"var(--text-3)", fontFamily:"var(--font-mono)", opacity:.7 }}>Ctrl+Enter</span>}
          </div>
        </div>
      </div>

      {loading && <ScanStatusBar depth={progress?.step ?? 0} maxDepth={MAX_DEPTH} stepInfo={stepInfo} />}

      {statusMsg && (
        <div style={{ background:"var(--success-bg)", border:"1px solid var(--green)", borderRadius:6,
          padding:"8px 14px", marginBottom:12, fontSize:12, color:"var(--success-text)", fontWeight:600 }}>
          {statusMsg}
        </div>
      )}

      <div ref={flagRef}>
        {topFlags.length > 0 && <FlagBanner flags={topFlags} autoCopy={autoCopy}
          onAutoCopyToggle={()=>setAutoCopy(v=>!v)} flagRe={flagRe} />}
      </div>

      {results?.length === 0 && !loading && (
        <>
          {assistMode && <HintBanner input={input} results={results} />}
          <FailurePanel input={input} results={results} />
        </>
      )}

      {/* Hint when all results are low confidence */}
      {results?.length > 0 && assistMode && results.every(r => (r.confidence??0) < 40) && (
        <HintBanner input={input} results={results} />
      )}

      {results?.map((r,i) => (
        <ResultCard key={i} r={r} rank={i} flagRe={flagRe}
          onSendToPipeline={onSendToPipeline} input={input}
          autoCopy={autoCopy} setAutoCopy={i===0?setAutoCopy:null}
          assistMode={assistMode} explainMode={explainMode}
          triedOps={triedOpsRef.current} />
      ))}
    </div>
  );
}

// ── Guided Mode ───────────────────────────────────────────────────────────────
function GuidedModeTab({ addHistory, flagRe, onSendToPipeline }) {
  const [input,      setInput]      = useState("");
  const [candidates, setCandidates] = useState(null);
  const [chosen,     setChosen]     = useState(null);
  const [decoded,    setDecoded]    = useState(null);

  const analyse = () => {
    if (!input.trim()) return;
    const raw = detect(input.trim());
    setCandidates(raw.slice(0,6));
    setChosen(null); setDecoded(null);
    addHistory?.("Guided Analysis", input.slice(0,40), raw.slice(0,3).map(c=>c.label).join(", "));
  };

  const apply = async (candidate) => {
    setChosen(candidate);
    const r = await autoSolve(input.trim());
    const kws = candidate.label?.toLowerCase().split(/\s+/) ?? [];
    const match = r.find(x => kws.some(kw => x.label?.toLowerCase().includes(kw)));
    setDecoded(match ?? r[0] ?? null);
  };

  return (
    <div>
      <p style={{ fontSize:12, color:"var(--text-2)", marginBottom:12 }}>
        Step-by-step assistant. Click a detected type to see reasoning, apply the decode,
        and send the result directly to Pipeline.
      </p>
      <div className="card" style={{ marginBottom:12 }}>
        <label>Input Ciphertext</label>
        <textarea rows={4} value={input}
          onChange={e=>{ setInput(e.target.value); setCandidates(null); setDecoded(null); }}
          placeholder="Paste your ciphertext or encoded string…" />
        <button className="btn btn-primary" style={{ marginTop:8 }} onClick={analyse} disabled={!input.trim()}>
          🧭 Analyse Input
        </button>
      </div>

      {candidates?.length === 0 && (
        <div style={{ color:"var(--text-2)", padding:16, textAlign:"center", fontSize:12 }}>
          Low signal — try pasting more of the ciphertext.
        </div>
      )}

      {candidates?.length > 0 && (
        <>
          <div style={{ fontSize:12, color:"var(--text-2)", marginBottom:8, fontWeight:600 }}>
            🔎 Detected types — click to apply:
          </div>
          {candidates.map((c,i) => {
            const col = confColor(c.confidence??0);
            const isActive = chosen?.toolId === c.toolId;
            return (
              <div key={i} onClick={()=>apply(c)} style={{ cursor:"pointer",
                opacity:chosen&&!isActive?0.5:1, transition:".15s" }}>
                <div style={{ background:"var(--bg-card-2)",
                  border:`1px solid ${isActive?"var(--accent)":"var(--border)"}`,
                  borderLeft:`3px solid ${CAT_COLOR[c.category]||col}`,
                  borderRadius:6, padding:"8px 12px", marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, alignItems:"center" }}>
                    <span style={{ fontWeight:700, color:"var(--text-1)", fontSize:13 }}>{c.label}</span>
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <span className={confTagClass(c.confidence??0)}>{confLabel(c.confidence??0)}</span>
                      <span style={{ color:"var(--text-1)", fontSize:11, fontWeight:700, fontFamily:"var(--font-mono)" }}>
                        {c.confidence??0}%
                      </span>
                    </div>
                  </div>
                  <div style={{ height:2, background:"var(--bg-hover)", borderRadius:2, marginBottom:6, overflow:"hidden" }}>
                    <div style={{ width:`${c.confidence??0}%`, height:"100%", background:col }} />
                  </div>
                  <div style={{ fontSize:11, color:"var(--text-2)" }}>
                    <span style={{ color:"var(--text-3)" }}>Reason: </span>{c.hint}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {chosen && (
        <div className="card" style={{ marginTop:4, borderLeft:"3px solid var(--accent)" }}>
          <div style={{ marginBottom:6 }}>
            <span style={{ fontSize:11, color:"var(--text-3)" }}>Detected: </span>
            <strong style={{ color:"var(--text-1)" }}>{chosen.label}</strong>
            <span style={{ fontSize:11, color:"var(--text-3)", marginLeft:8 }}>({chosen.confidence??0}%)</span>
          </div>
          <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:8 }}>
            <strong style={{ color:"var(--text-2)" }}>Reason: </strong>{chosen.hint}
          </div>
          <div style={{ fontSize:12, color:"var(--accent)", marginBottom:10, fontWeight:600 }}>
            ▶ {nextStep(chosen.label)}
          </div>
          {decoded ? (
            <>
              <pre style={{ background:"var(--bg-output)", padding:8, borderRadius:4, fontSize:12,
                color:"var(--output-col)", overflow:"auto", maxHeight:120, whiteSpace:"pre-wrap",
                wordBreak:"break-all", margin:"0 0 8px" }}>{decoded.output}</pre>
              {detectAllFlags(decoded.output, flagRe).length > 0 && (
                <FlagBanner flags={detectAllFlags(decoded.output, flagRe)} />
              )}
              <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:6 }}>
                <div style={{ fontSize:11, color:"var(--text-3)", flex:1 }}>
                  ↻ Copy the output and paste it above to decode the next layer.
                </div>
                <PipelineBtn label={chosen.label} output={decoded.output}
                  input={input} onSendToPipeline={onSendToPipeline} />
              </div>
            </>
          ) : (
            <div style={{ color:"var(--text-3)", fontSize:12 }}>
              No automatic decode available — use the dedicated sidebar tool.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function SmartSolverView({ addHistory, onSendToPipeline, activeWorkspaceId, privateMode }) {
  const [tab,         setTab]         = useState("quick");
  const [customRe,    setCustomRe]    = useState("");
  const [showReBox,   setShowReBox]   = useState(false);
  const [reError,     setReError]     = useState(null);
  const [autoCopy,    setAutoCopy]    = useState(false);
  const [assistMode,  setAssistMode]  = useState(false);
  const [explainMode, setExplainMode] = useState(false);

  const flagRe = (() => {
    if (!customRe.trim()) return DEFAULT_FLAG_RE;
    try { const r = new RegExp(customRe, "i"); setReError(null); return r; }
    catch(e) { setReError(e.message); return DEFAULT_FLAG_RE; }
  })();

  return (
    <div>
      <div className="section-header">
        <h3>🧠 Smart Solver</h3>
        <p>Intelligent analysis workbench — detect, score, explain, and decode. Send results directly to Manual Pipeline.</p>
      </div>

      {/* Assist mode active indicator */}
      {(assistMode || explainMode) && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
          {assistMode && (
            <div style={{ fontSize:10, background:"var(--accent-dim)",
              border:"1px solid var(--accent)44", borderRadius:4, padding:"3px 10px",
              color:"var(--accent)", fontFamily:"var(--font-mono)" }}>
              🧠 Assist Mode ON — next-step suggestions + confidence verdicts enabled
            </div>
          )}
          {explainMode && (
            <div style={{ fontSize:10, background:"var(--accent-dim)",
              border:"1px solid var(--accent-2)44", borderRadius:4, padding:"3px 10px",
              color:"var(--accent-2)", fontFamily:"var(--font-mono)" }}>
              📖 Explain Mode ON — transform explanations visible on each result
            </div>
          )}
        </div>
      )}

      {/* Private mode notice — shown when private mode is ON (default) */}
      {privateMode && (
        <div style={{ fontSize:10, color:"var(--text-3)", fontFamily:"var(--font-mono)",
          marginBottom:8, display:"flex", alignItems:"center", gap:6,
          padding:"4px 10px", background:"var(--bg-hover)",
          border:"1px solid var(--border-sub)", borderRadius:4 }}>
          🔒 Private mode — inputs are not stored. Toggle in the workspace bar to persist.
        </div>
      )}
      <div style={{ marginBottom:12, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <button className="btn btn-ghost btn-sm" onClick={()=>setShowReBox(s=>!s)} style={{ fontSize:11 }}>
          {showReBox?"▴ Hide flag regex":"▾ Custom flag regex"}
        </button>
        <label style={{ fontSize:11, color:"var(--text-2)", display:"flex", gap:4, alignItems:"center", cursor:"pointer" }}>
          <input type="checkbox" checked={autoCopy} onChange={()=>setAutoCopy(v=>!v)} />
          Auto-copy first flag
        </label>
        {/* Assist Mode toggle */}
        <label style={{ fontSize:11, display:"flex", gap:4, alignItems:"center", cursor:"pointer",
          color: assistMode ? "var(--accent)" : "var(--text-2)",
          background: assistMode ? "var(--accent-dim)" : "transparent",
          border: `1px solid ${assistMode ? "var(--accent)44" : "transparent"}`,
          borderRadius:4, padding:"2px 8px", transition:".15s" }}
          data-tooltip="Show next-step suggestions, confidence verdicts, and pipeline previews">
          <input type="checkbox" checked={assistMode} onChange={()=>setAssistMode(v=>!v)} />
          🧠 Assist Mode
        </label>
        {/* Explain Mode toggle — only makes sense alongside Assist Mode */}
        <label style={{ fontSize:11, display:"flex", gap:4, alignItems:"center", cursor:"pointer",
          color: explainMode ? "var(--accent-2)" : "var(--text-2)",
          background: explainMode ? "var(--accent-dim)" : "transparent",
          border: `1px solid ${explainMode ? "var(--accent-2)44" : "transparent"}`,
          borderRadius:4, padding:"2px 8px", transition:".15s" }}
          data-tooltip="Show a brief explanation of each transformation — what it is, how to spot it, CTF notes">
          <input type="checkbox" checked={explainMode} onChange={()=>setExplainMode(v=>!v)} />
          📖 Explain Mode
        </label>
      </div>
      {showReBox && (
        <div style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
          <input value={customRe} onChange={e=>setCustomRe(e.target.value)}
            placeholder="Default: /(flag|ctf|ovrd|hack|htb|pico)\\{[^}]+\\}/i"
            style={{ flex:1, fontSize:11, fontFamily:"var(--font-mono)" }} />
          <button className="btn btn-ghost btn-sm" onClick={()=>setCustomRe("")}>Reset</button>
        </div>
      )}
      {reError && <div style={{ fontSize:11, color:"#f87171", marginBottom:8 }}>Invalid regex: {reError}</div>}

      <div className="tabs-wrap">
        {[["quick","⚡ Quick Scan"],["deep","🔍 Deep Scan"],["guided","🧭 Guided Mode"]].map(([id,l]) => (
          <button key={id} className={`tab${tab===id?" active":""}`} onClick={()=>setTab(id)}>{l}</button>
        ))}
      </div>

      {tab==="quick"  && <QuickScanTab  addHistory={addHistory} flagRe={flagRe}
        onSendToPipeline={onSendToPipeline} autoCopy={autoCopy} setAutoCopy={setAutoCopy}
        assistMode={assistMode} explainMode={explainMode}
        activeWorkspaceId={activeWorkspaceId} privateMode={privateMode} />}
      {tab==="deep"   && <DeepScanTab   addHistory={addHistory} flagRe={flagRe}
        onSendToPipeline={onSendToPipeline} autoCopy={autoCopy} setAutoCopy={setAutoCopy}
        assistMode={assistMode} explainMode={explainMode}
        activeWorkspaceId={activeWorkspaceId} privateMode={privateMode} />}
      {tab==="guided" && <GuidedModeTab addHistory={addHistory} flagRe={flagRe}
        onSendToPipeline={onSendToPipeline} />}
    </div>
  );
}
