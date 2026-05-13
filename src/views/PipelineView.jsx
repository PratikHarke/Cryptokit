import React, { useState, useCallback, useRef, useEffect } from "react";

import { caesarEnc, caesarDec, rot13 }  from "../crypto/caesar.js";
import { b64Enc, b64Dec }               from "../crypto/base64.js";
import { xorEnc, xorDec }              from "../crypto/xor.js";
import { urlEncode, urlDecode, hexToAscii, asciiToHex, binaryToAscii, asciiToBinary } from "../crypto/converters.js";
import { CopyBtn }                      from "../components/Output.jsx";
import { autoSolve }                    from "../crypto/autoSolver.js";
import { readWorkspaceData, saveWorkspaceData } from "../lib/workspace.js";

// ─── Operation Registry ────────────────────────────────────────────────────────
const OPS = [
  { id:"b64dec",    tool:"base64.decode",   label:"Base64 → Text",    group:"Encoding",
    desc:"Decodes Base64-encoded text to its original plaintext form.", fn:b64Dec, param:null },
  { id:"b64enc",    tool:"base64.encode",   label:"Text → Base64",    group:"Encoding",
    desc:"Encodes text to Base64 — useful for wrapping binary or special chars.", fn:b64Enc, param:null },
  { id:"hexdec",    tool:"hex.decode",      label:"Hex → ASCII",      group:"Encoding",
    desc:"Converts a hex string (e.g. 48656c6c6f) to readable ASCII text.", fn:hexToAscii, param:null },
  { id:"hexenc",    tool:"hex.encode",      label:"ASCII → Hex",      group:"Encoding",
    desc:"Encodes each character to its two-digit hex byte value.", fn:asciiToHex, param:null },
  { id:"urldec",    tool:"url.decode",      label:"URL Decode",       group:"Encoding",
    desc:"Decodes percent-encoded characters — e.g. %7B → {.", fn:urlDecode, param:null },
  { id:"urlenc",    tool:"url.encode",      label:"URL Encode",       group:"Encoding",
    desc:"Percent-encodes special characters for safe URL transmission.", fn:urlEncode, param:null },
  { id:"bintoasc",  tool:"binary.decode",   label:"Binary → ASCII",   group:"Encoding",
    desc:"Converts space-separated 8-bit binary strings to ASCII characters.", fn:binaryToAscii, param:null },
  { id:"asctobin",  tool:"binary.encode",   label:"ASCII → Binary",   group:"Encoding",
    desc:"Converts each character to its 8-bit binary representation.", fn:asciiToBinary, param:null },
  { id:"rot13",     tool:"caesar.rot13",    label:"ROT-13",           group:"Ciphers",
    desc:"Substitutes each letter by rotating 13 positions — its own inverse.", fn:rot13, param:null },
  { id:"caesar",    tool:"caesar.shift",    label:"Caesar Shift",     group:"Ciphers",
    desc:"Shifts each letter by N positions in the alphabet (wraps at Z).",
    fn:null, param:{ type:"number", label:"Shift (1-25)", default:3, min:1, max:25 } },
  { id:"caesardec", tool:"caesar.unshift",  label:"Caesar Unshift",   group:"Ciphers",
    desc:"Reverses a Caesar shift — subtracts N instead of adding.",
    fn:null, param:{ type:"number", label:"Shift (1-25)", default:3, min:1, max:25 } },
  { id:"xorkey",    tool:"xor.key",         label:"XOR (key → hex)",  group:"Ciphers",
    desc:"XORs plaintext with a repeating key and outputs hex ciphertext.",
    fn:null, param:{ type:"text", label:"Key", default:"key" } },
  { id:"xordec",    tool:"xor.decrypt",     label:"XOR Decrypt (hex)",group:"Ciphers",
    desc:"XORs a hex ciphertext with a repeating key and outputs plaintext.",
    fn:null, param:{ type:"text", label:"Key", default:"key" } },
  { id:"reverse",   tool:"text.reverse",    label:"Reverse",          group:"Text",
    desc:"Reverses the character order of the entire input string.",
    fn:t=>t.split("").reverse().join(""), param:null },
  { id:"upper",     tool:"text.upper",      label:"Uppercase",        group:"Text",
    desc:"Converts all letters to uppercase.", fn:t=>t.toUpperCase(), param:null },
  { id:"lower",     tool:"text.lower",      label:"Lowercase",        group:"Text",
    desc:"Converts all letters to lowercase.", fn:t=>t.toLowerCase(), param:null },
  { id:"stripspace",tool:"text.stripspace", label:"Strip Spaces",     group:"Text",
    desc:"Removes all whitespace characters including newlines.",
    fn:t=>t.replace(/\s+/g,""), param:null },
  { id:"trim",      tool:"text.trim",       label:"Trim",             group:"Text",
    desc:"Removes leading and trailing whitespace.", fn:t=>t.trim(), param:null },
];

const GROUPS = ["Encoding", "Ciphers", "Text"];
const OPS_MAP  = Object.fromEntries(OPS.map(o=>[o.id, o]));
const TOOL_MAP = Object.fromEntries(OPS.map(o=>[o.tool, o]));

// ─── JSON recipe ───────────────────────────────────────────────────────────────
let uid = 0;

function recipeToSteps(recipe) {
  const errors = [];
  const steps = (recipe.steps ?? []).map(s => {
    const op = TOOL_MAP[s.tool];
    if (!op) { errors.push(s.tool); return null; }
    return { id: uid++, opId: op.id, param: s.param ?? op.param?.default?.toString() ?? "" };
  }).filter(Boolean);
  return { steps, errors };
}

function stepsToRecipe(name, steps) {
  return {
    name: name || "CryptoKit Pipeline",
    version: 1,
    steps: steps.map(s => ({
      tool: OPS_MAP[s.opId]?.tool ?? s.opId,
      ...(s.param ? { param: s.param } : {}),
    })),
  };
}

function newStep(opId = "b64dec") {
  const op = OPS_MAP[opId];
  return { id: uid++, opId, param: op?.param?.default?.toString() ?? "" };
}

function applyOp(opId, input, param) {
  const op = OPS_MAP[opId];
  if (!op) return "Unknown operation";

  // ── Pre-flight validation: catch likely invalid chains early ──────────
  if (opId === "b64dec" && !/^[A-Za-z0-9+/\-_]+=*$/.test(input.trim())) {
    return "⚠ Input does not appear to be Base64 — decode skipped.";
  }
  if (opId === "hexdec" && !/^[0-9a-fA-F\s]+$/.test(input.trim())) {
    return "⚠ Input does not appear to be hex — decode skipped.";
  }
  if ((opId === "b32dec") && !/^[A-Z2-7=\s]+$/i.test(input.trim())) {
    return "⚠ Input does not appear to be Base32 — decode skipped.";
  }

  try {
    if (op.fn)              return op.fn(input);
    if (opId==="caesar")    return caesarEnc(input, Number(param)||0);
    if (opId==="caesardec") return caesarDec(input, Number(param)||0);
    if (opId==="xorkey")    return xorEnc(input, param||"key");
    if (opId==="xordec")    return xorDec(input, param||"key");
  } catch(e) { return `Error: ${e.message}`; }
  return input;
}

// ─── Import panel ──────────────────────────────────────────────────────────────
function ImportPanel({ onLoad, onClose }) {
  const [raw,   setRaw]   = useState("");
  const [error, setError] = useState(null);

  const handleLoad = () => {
    setError(null);
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { setError("Invalid JSON — check your syntax."); return; }

    if (!parsed || typeof parsed !== "object")
      return setError("JSON must be an object with { name, steps[] }.");
    if (!Array.isArray(parsed.steps) || parsed.steps.length === 0)
      return setError("Recipe must have a non-empty steps array.");
    const badSteps = parsed.steps.filter(s => !s.tool);
    if (badSteps.length)
      return setError(`Each step must have a "tool" field. Found ${badSteps.length} step(s) missing it.`);

    const { steps, errors } = recipeToSteps(parsed);
    if (steps.length === 0)
      return setError(`No recognised tools found. Unsupported: ${errors.join(", ")}`);

    const warn = errors.length ? ` (${errors.length} unsupported tool(s) skipped: ${errors.join(", ")})` : "";
    onLoad(steps, parsed.name || "Imported Recipe", warn);
  };

  const placeholder = JSON.stringify({
    name: "CTF Layer Decode",
    version: 1,
    steps: [
      { tool: "base64.decode" },
      { tool: "hex.decode" },
      { tool: "caesar.rot13" },
    ],
  }, null, 2);

  return (
    <div style={{ background:"var(--bg-card)", border:"1px solid var(--accent)", borderRadius:8,
      padding:16, marginBottom:16, position:"relative" }}>
      <button onClick={onClose} style={{ position:"absolute", top:10, right:12,
        background:"none", border:"none", color:"var(--text-3)", cursor:"pointer", fontSize:18 }}>✕</button>
      <div className="card-title" style={{ marginBottom:8 }}>📥 Import Recipe JSON</div>
      <p style={{ fontSize:11, color:"var(--text-3)", marginBottom:8, lineHeight:1.5 }}>
        Paste a pipeline recipe. Must be a JSON object with{" "}
        <code style={{ color:"var(--accent)" }}>{`{ name, steps: [{ tool, param? }] }`}</code>.
      </p>
      <textarea rows={8} value={raw} onChange={e=>setRaw(e.target.value)}
        placeholder={placeholder}
        style={{ fontFamily:"var(--font-mono)", fontSize:11, width:"100%", marginBottom:8 }} />
      {error && (
        <div style={{ background:"#7f1d1d22", border:"1px solid #ef444455", borderRadius:6,
          padding:"8px 12px", fontSize:12, color:"#f87171", marginBottom:8 }}>
          ❌ {error}
        </div>
      )}
      <div style={{ display:"flex", gap:8 }}>
        <button className="btn btn-primary" onClick={handleLoad} disabled={!raw.trim()}>Load Recipe</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  const ref = useRef();
  useCallback(() => {
    ref.current = setTimeout(onDone, 2800);
    return () => clearTimeout(ref.current);
  }, [onDone])();

  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999,
      background:"#14532d", border:"1px solid #22c55e", borderRadius:8,
      padding:"10px 18px", fontSize:13, color:"#86efac", boxShadow:"0 4px 20px #0008",
      animation:"fadeIn .2s" }}>
      ✅ {msg}
    </div>
  );
}

// ─── Step component ────────────────────────────────────────────────────────────
function PipelineStep({ step, index, inputText, output, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const op      = OPS_MAP[step.opId];
  const isError = typeof output === "string" && output.startsWith("Error");
  const before  = (inputText ?? "").slice(0,50) + ((inputText?.length??0)>50?"…":"");
  const after   = (output   ?? "").slice(0,50) + ((output?.length  ??0)>50?"…":"");

  return (
    <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)",
      borderRadius:8, marginBottom:10, overflow:"hidden" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px",
        background:"var(--bg-card-2)", borderBottom:"1px solid var(--border)" }}>
        <span style={{ fontSize:10, fontWeight:700, color:"var(--text-3)",
          background:"var(--bg-hover)", borderRadius:4, padding:"2px 7px",
          minWidth:24, textAlign:"center" }}>{index+1}</span>

        <select value={step.opId}
          onChange={e=>onUpdate(step.id,{opId:e.target.value,param:OPS_MAP[e.target.value]?.param?.default?.toString()??""})}
          style={{ flex:1, fontSize:12, padding:"4px 8px", height:28 }}>
          {GROUPS.map(g => (
            <optgroup key={g} label={g}>
              {OPS.filter(o=>o.group===g).map(o=>(
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </optgroup>
          ))}
        </select>

        {op?.param && (
          <input type={op.param.type} value={step.param} placeholder={op.param.label}
            min={op.param.min} max={op.param.max}
            onChange={e=>onUpdate(step.id,{param:e.target.value})}
            style={{ width:op.param.type==="number"?64:90, fontSize:12, padding:"4px 8px", height:28 }} />
        )}

        <div style={{ display:"flex", gap:3 }}>
          <button className="btn btn-ghost btn-sm" onClick={()=>onMoveUp(step.id)}   disabled={isFirst} style={{ padding:"3px 7px" }}>↑</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>onMoveDown(step.id)} disabled={isLast}  style={{ padding:"3px 7px" }}>↓</button>
          <button onClick={()=>onRemove(step.id)}
            style={{ background:"#7f1d1d22", color:"#f87171", border:"1px solid #7f1d1d44",
              borderRadius:4, padding:"3px 7px", fontSize:11, cursor:"pointer" }}>✕</button>
        </div>
      </div>

      {/* Description */}
      {op?.desc && (
        <div style={{ padding:"5px 12px", fontSize:10, color:"var(--text-3)",
          background:"var(--bg-hover)", borderBottom:"1px solid var(--border-sub)" }}>
          {op.desc}
        </div>
      )}

      {/* Before → after */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 20px 1fr", gap:0,
        padding:"5px 12px", borderBottom:"1px solid var(--border-sub)",
        fontSize:10, fontFamily:"var(--font-mono)", color:"var(--text-3)" }}>
        <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {before || <span style={{ color:"var(--text-4)" }}>—</span>}
        </div>
        <div style={{ textAlign:"center", color:"var(--accent)" }}>→</div>
        <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          color:isError?"#f87171":"var(--green)" }}>
          {isError ? "Error" : (after || "—")}
        </div>
      </div>

      {/* Output */}
      <div style={{ padding:"8px 12px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <span style={{ fontSize:10, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:.5 }}>Output</span>
          <div style={{ display:"flex", gap:6 }}>
            {(output?.length??0) > 50 && (
              <button className="btn btn-ghost btn-sm" style={{ fontSize:10 }} onClick={()=>setExpanded(e=>!e)}>
                {expanded?"Collapse":"Expand"}
              </button>
            )}
            {output && !isError && <CopyBtn text={output} />}
          </div>
        </div>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:12,
          color:isError?"#f87171":"var(--output-col)", wordBreak:"break-all",
          whiteSpace:"pre-wrap", lineHeight:1.5,
          maxHeight:expanded?400:60, overflowY:"auto", transition:"max-height .2s" }}>
          {output || <span style={{ color:"var(--text-4)" }}>—</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Suggest next step ────────────────────────────────────────────────────────
const SUGGEST_MAP = [
  { matches: s => /^[A-Za-z0-9+/\r\n]+=*$/.test(s.trim()) && s.trim().length % 4 === 0 && s.trim().length > 4,
    label: "Base64 detected", sub: "→ Decode it to reveal the next layer", opId: "b64dec" },
  { matches: s => /^[0-9a-fA-F\s]+$/.test(s.trim()) && s.replace(/\s/g,"").length % 2 === 0 && s.trim().length > 2,
    label: "Hex string detected", sub: "→ Convert to ASCII characters", opId: "hexdec" },
  { matches: s => s.includes("%") && /(%[0-9A-Fa-f]{2})/.test(s),
    label: "URL-encoded text detected", sub: "→ Decode percent-encoded characters", opId: "urldec" },
  { matches: s => /^[01\s]+$/.test(s.trim()) && s.replace(/\s/g,"").length % 8 === 0 && s.trim().length > 8,
    label: "Binary data detected", sub: "→ Convert 8-bit groups to ASCII", opId: "bintoasc" },
];

function SuggestNextStep({ output, onAdd }) {
  const sug = SUGGEST_MAP.find(r => r.matches(output));
  if (!sug) return null;
  return (
    <div className="suggest-card">
      <div>
        <div className="suggest-card-label">💡 Suggested Next Step</div>
        <div className="suggest-card-title">{sug.label}</div>
        <div className="suggest-card-sub">{sug.sub}</div>
      </div>
      {sug.opId && (
        <button className="btn btn-ghost btn-sm" style={{ whiteSpace:"nowrap", flexShrink:0 }}
          onClick={() => onAdd(sug.opId)}>
          + Add Step
        </button>
      )}
    </div>
  );
}

// ─── Main View ─────────────────────────────────────────────────────────────────
export default function PipelineView({ addHistory, pipelineQueue, onClearPipelineQueue, activeWorkspaceId, privateMode }) {
  const [input,       setInput]       = useState("");
  const [steps,       setSteps]       = useState([newStep("b64dec")]);
  const [name,        setName]        = useState("");
  const [suggestion,  setSuggestion]  = useState(null);

  // Load pipeline steps from workspace on mount / workspace switch
  useEffect(() => {
    if (!activeWorkspaceId || privateMode) return;
    const data = readWorkspaceData(activeWorkspaceId);
    if (data.pipeline?.length) {
      // Validate loaded steps against OPS_MAP before restoring
      const valid = data.pipeline.filter(s => s.opId && OPS_MAP[s.opId]);
      if (valid.length) setSteps(valid.map(s => ({ ...s, id: uid++ })));
    }
  }, [activeWorkspaceId]);

  // Persist pipeline steps to workspace whenever they change (private mode aware)
  useEffect(() => {
    if (!activeWorkspaceId) return;
    const data = readWorkspaceData(activeWorkspaceId);
    // Strip function references — only serialisable fields
    const serialisable = steps.map(s => ({ opId: s.opId, param: s.param }));
    saveWorkspaceData(activeWorkspaceId, { ...data, pipeline: serialisable }, privateMode);
  }, [steps, activeWorkspaceId, privateMode]);

  // Consume incoming pipeline queue from Smart Solver
  React.useEffect(() => {
    if (!pipelineQueue) return;
    // Map recipe-format ops to internal steps
    const newSteps = (pipelineQueue.steps ?? []).map(s => {
      const op = TOOL_MAP[s.tool];
      if (!op) return null;
      return { id: uid++, opId: op.id, param: s.param ?? op.param?.default?.toString() ?? "" };
    }).filter(Boolean);
    if (newSteps.length) {
      setSteps(newSteps);
      if (pipelineQueue.input) setInput(pipelineQueue.input);
      setLoadedName("From Smart Solver");
      setToast(`${newSteps.length} step${newSteps.length>1?"s":""} applied from Smart Solver`);
    }
    onClearPipelineQueue?.();
  }, [pipelineQueue]);
  const [showImport,  setShowImport]  = useState(false);
  const [toast,       setToast]       = useState(null);
  const [copyJSON,    setCopyJSON]    = useState(false);
  const [loadedName,  setLoadedName]  = useState(null);

  const outputs = steps.reduce((acc, step) => {
    const prev = acc.length===0 ? input : acc[acc.length-1];
    return [...acc, applyOp(step.opId, prev, step.param)];
  }, []);
  const finalOutput = outputs[outputs.length-1] ?? input;

  const addStep    = ()    => setSteps(s=>[...s, newStep("rot13")]);
  const clearSteps = ()    => { setSteps([newStep("b64dec")]); setLoadedName(null); };
  const updateStep = useCallback((id,patch) =>
    setSteps(s=>s.map(st=>st.id===id?{...st,...patch}:st)),[]);
  const removeStep = useCallback((id) =>
    setSteps(s=>s.filter(st=>st.id!==id)),[]);
  const moveUp = useCallback((id) =>
    setSteps(s=>{const i=s.findIndex(st=>st.id===id);if(i===0)return s;const c=[...s];[c[i-1],c[i]]=[c[i],c[i-1]];return c;}),[]);
  const moveDown = useCallback((id) =>
    setSteps(s=>{const i=s.findIndex(st=>st.id===id);if(i===s.length-1)return s;const c=[...s];[c[i],c[i+1]]=[c[i+1],c[i]];return c;}),[]);

  const handleLoad = (newSteps, recipeName, warn) => {
    setSteps(newSteps);
    setLoadedName(recipeName);
    setShowImport(false);
    setToast(warn ? `Recipe loaded: "${recipeName}"${warn}` : `Recipe loaded: "${recipeName}"`);
  };

  const log = () => {
    addHistory(
      "Pipeline: "+steps.map(s=>OPS_MAP[s.opId]?.label).join(" → "),
      input.slice(0,30), finalOutput.slice(0,60),
    );
  };

  const exportJSON = () => {
    const json = JSON.stringify(stepsToRecipe(name, steps), null, 2);
    navigator.clipboard.writeText(json).then(()=>{
      setCopyJSON(true); setTimeout(()=>setCopyJSON(false), 2000);
    });
  };

  return (
    <div>
      {toast && <Toast msg={toast} onDone={()=>setToast(null)} />}

      <div className="section-header">
        <h3>⛓ Manual Pipeline</h3>
        <p>Chain transforms — each step's output feeds the next. Every step shows a description and before → after preview.</p>
      </div>

      {/* Loaded recipe banner */}
      {loadedName && (
        <div style={{ background:"#1e3a5f44", border:"1px solid #3b82f6", borderRadius:6,
          padding:"8px 14px", marginBottom:12, fontSize:12, color:"#93c5fd",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>📋 Loaded recipe: <strong>{loadedName}</strong></span>
          <button className="btn btn-ghost btn-sm" onClick={clearSteps}>Clear</button>
        </div>
      )}

      {/* Import panel */}
      {showImport && <ImportPanel onLoad={handleLoad} onClose={()=>setShowImport(false)} />}

      {/* Input */}
      <div className="card" style={{ marginBottom:12 }}>
        <label>Pipeline input</label>
        <textarea value={input} onChange={e=>setInput(e.target.value)}
          placeholder="Paste ciphertext, hex, Base64, or any encoded text…" rows={3} />
      </div>

      {/* Steps with connectors */}
      {steps.length === 0 ? (
        <div className="pipe-empty">
          <div className="pipe-empty-icon">⛓</div>
          <div className="pipe-empty-title">No steps yet</div>
          <div className="pipe-empty-sub">Add a step below or import a recipe to get started</div>
        </div>
      ) : (
        steps.map((step, i) => (
          <React.Fragment key={step.id}>
            <PipelineStep step={step} index={i}
              inputText={i===0?input:outputs[i-1]}
              output={outputs[i]}
              onUpdate={updateStep} onRemove={removeStep}
              onMoveUp={moveUp} onMoveDown={moveDown}
              isFirst={i===0} isLast={i===steps.length-1} />
            {i < steps.length - 1 && (
              <div className="pipe-connector">
                <span className="pipe-connector-arrow">▼</span>
              </div>
            )}
          </React.Fragment>
        ))
      )}

      {/* Suggest next step */}
      {finalOutput && (
        <SuggestNextStep output={finalOutput} onAdd={op => {
          const step = newStep(op);
          setSteps(s => [...s, step]);
          setSuggestion(null);
        }} />
      )}

      {/* Action bar */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <button className="btn btn-ghost" style={{ flex:1 }} onClick={addStep}>+ Add Step</button>
        <button className="btn btn-ghost" onClick={()=>setShowImport(s=>!s)} style={{ fontSize:12 }}>
          {showImport?"Hide Import":"📥 Import JSON"}
        </button>
        <button className="btn btn-ghost" onClick={clearSteps} style={{ fontSize:12 }}>↺ Reset</button>
        <button className="btn btn-primary" style={{ flex:1 }} onClick={log}>Log to History ↗</button>
      </div>

      {/* Final output */}
      {steps.length > 0 && (
        <div className="card" style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div className="card-title" style={{ margin:0 }}>Final Output</div>
            {finalOutput && <CopyBtn text={finalOutput} />}
          </div>
          <pre style={{ background:"var(--bg-output)", border:"1px solid #3b82f633",
            borderRadius:6, padding:"10px 12px", fontFamily:"var(--font-mono)", fontSize:13,
            color:"var(--output-col)", wordBreak:"break-all", whiteSpace:"pre-wrap",
            lineHeight:1.5, margin:0, minHeight:36, maxHeight:200, overflowY:"auto" }}>
            {finalOutput || <span style={{ color:"var(--text-4)" }}>Output will appear here…</span>}
          </pre>
        </div>
      )}

      {/* Recipe JSON export */}
      <div className="card">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div>
            <div className="card-title" style={{ margin:0 }}>Recipe JSON Export</div>
            <div style={{ fontSize:10, color:"var(--text-3)", marginTop:2 }}>
              Copy to share or re-import this pipeline later.
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={exportJSON}>
            {copyJSON ? "✓ Copied!" : "Copy JSON"}
          </button>
        </div>
        <input value={name} onChange={e=>setName(e.target.value)}
          placeholder='Recipe name (e.g. "CTF Layer Decode")' style={{ fontSize:12, marginBottom:8 }} />
        <pre style={{ background:"var(--bg-card-2)", padding:8, borderRadius:4, fontSize:10,
          color:"var(--text-3)", maxHeight:120, overflowY:"auto", margin:0 }}>
          {JSON.stringify(stepsToRecipe(name, steps), null, 2)}
        </pre>
      </div>
    </div>
  );
}
