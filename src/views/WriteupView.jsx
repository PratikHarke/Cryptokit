import { useState, useMemo, useEffect } from "react";
import { CopyBtn } from "../components/Output.jsx";
import { readWorkspaceData, saveWorkspaceData } from "../lib/workspace.js";

function formatTs(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

// ── Markdown generator ────────────────────────────────────────────────────────
function generateMarkdown({ title, category, difficulty, tags, notes, flag, entries }) {
  const date = new Date().toLocaleDateString("en-US", {
    year:"numeric", month:"long", day:"numeric",
  });

  const toolsUsed = [...new Set(entries.map(e => e.op))].join(", ") || "CryptoKit";
  const tagLine   = tags ? tags.split(",").map(t => `\`${t.trim()}\``).join(" ") : "";

  const lines = [
    `# ${title || "CTF Writeup"}`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| **Date** | ${date} |`,
    category   ? `| **Category** | ${category} |` : null,
    difficulty ? `| **Difficulty** | ${difficulty} |` : null,
    tagLine    ? `| **Tags** | ${tagLine} |` : null,
    `| **Tools** | CryptoKit |`,
    flag       ? `| **Flag** | \`${flag}\` |` : null,
    ``,
  ].filter(l => l !== null);

  if (notes.trim()) {
    lines.push(`## Overview`, ``, notes.trim(), ``);
  }

  lines.push(`## Solution`, ``);

  if (entries.length === 0) {
    lines.push(`*No operations recorded yet. Use CryptoKit tools and they will appear here.*`, ``);
  } else {
    entries.forEach((e, i) => {
      lines.push(`### Step ${i + 1}: ${e.op}`);
      lines.push(``);
      if (e.input && e.input !== "[saved]") {
        lines.push(`**Input:**`);
        lines.push("```");
        lines.push(e.input.slice(0, 400));
        lines.push("```");
        lines.push(``);
      }
      if (e.output && e.output !== "[saved]") {
        lines.push(`**Output:**`);
        lines.push("```");
        lines.push(e.output.slice(0, 400));
        lines.push("```");
        lines.push(``);
      }
      if (e.timestamp) lines.push(`*${formatTs(e.timestamp)}*`, ``);
    });
  }

  if (flag) {
    lines.push(`## Flag`, ``, `\`\`\``, flag, `\`\`\``, ``);
  }

  lines.push(
    `---`,
    ``,
    `*Generated with [CryptoKit](https://github.com/cryptokit) — privacy-first CTF crypto, ` +
    `encoding, hash, and forensic analysis workbench.*`,
  );

  return lines.join("\n");
}

// ── Step editor card ──────────────────────────────────────────────────────────
function StepCard({ entry, index, onEdit, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      background:"var(--bg-card)", border:"1px solid var(--border)",
      borderRadius:6, marginBottom:6, overflow:"hidden",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
        cursor:"pointer", userSelect:"none" }} onClick={() => setExpanded(e => !e)}>
        <span style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--text-3)",
          minWidth:22, textAlign:"center",
          background:"var(--bg-hover)", padding:"1px 5px", borderRadius:3 }}>
          {index + 1}
        </span>
        <span style={{ flex:1, fontWeight:600, color:"var(--text-1)", fontSize:12 }}>{entry.op}</span>
        <span style={{ fontSize:10, color:"var(--text-3)" }}>{formatTs(entry.timestamp)}</span>
        <span style={{ fontSize:11, color: entry.status === "ok" ? "var(--green)" : "var(--red)" }}>
          {entry.status === "ok" ? "✓" : "✗"}
        </span>
        <button onClick={e => { e.stopPropagation(); onRemove(entry.id); }}
          style={{ background:"none", border:"none", color:"var(--text-3)", cursor:"pointer",
            fontSize:14, padding:"0 2px", lineHeight:1 }}>✕</button>
        <span style={{ fontSize:11, color:"var(--text-3)" }}>{expanded ? "▴" : "▾"}</span>
      </div>
      {expanded && (
        <div style={{ padding:"0 12px 10px", borderTop:"1px solid var(--border-sub)" }}>
          {entry.input && entry.input !== "[saved]" && (
            <div style={{ marginTop:8 }}>
              <div style={{ fontSize:10, color:"var(--text-3)", marginBottom:3,
                textTransform:"uppercase", letterSpacing:1 }}>Input</div>
              <pre style={{ background:"var(--bg-input)", padding:"6px 8px", borderRadius:4,
                fontSize:11, color:"var(--text-2)", wordBreak:"break-all", whiteSpace:"pre-wrap",
                margin:0 }}>{entry.input}</pre>
            </div>
          )}
          {entry.output && entry.output !== "[saved]" && (
            <div style={{ marginTop:8 }}>
              <div style={{ fontSize:10, color:"var(--text-3)", marginBottom:3,
                textTransform:"uppercase", letterSpacing:1 }}>Output</div>
              <pre style={{ background:"var(--bg-output)", padding:"6px 8px", borderRadius:4,
                fontSize:11, color:"var(--output-col)", wordBreak:"break-all", whiteSpace:"pre-wrap",
                margin:0 }}>{entry.output}</pre>
            </div>
          )}
          <div style={{ marginTop:8 }}>
            <label style={{ fontSize:10, color:"var(--text-3)", textTransform:"uppercase",
              letterSpacing:1, display:"block", marginBottom:3 }}>Explanation (optional)</label>
            <input
              placeholder="Add a note explaining this step…"
              style={{ width:"100%", fontSize:11, padding:"4px 8px" }}
              value={entry._note || ""}
              onChange={e => onEdit(entry.id, "_note", e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function WriteupView({ history, activeWorkspaceId, privateMode }) {
  const [title,      setTitle]      = useState("");
  const [category,   setCategory]   = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tags,       setTags]       = useState("");
  const [notes,      setNotes]      = useState("");
  const [flag,       setFlag]       = useState("");
  const [entries,    setEntries]    = useState(() => history.slice(0, 30));
  const [preview,    setPreview]    = useState(false);
  const [copied,     setCopied]     = useState(false);

  // Load saved writeup notes from workspace on mount / workspace switch
  useEffect(() => {
    if (!activeWorkspaceId || privateMode) return;
    const data = readWorkspaceData(activeWorkspaceId);
    if (data.writeupNotes) {
      try {
        const saved = JSON.parse(data.writeupNotes);
        if (saved.title)      setTitle(saved.title);
        if (saved.category)   setCategory(saved.category);
        if (saved.difficulty) setDifficulty(saved.difficulty);
        if (saved.tags)       setTags(saved.tags);
        if (saved.notes)      setNotes(saved.notes);
        if (saved.flag)       setFlag(saved.flag);
      } catch { /* malformed saved data — start fresh */ }
    }
  }, [activeWorkspaceId]);

  // Persist writeup state to workspace whenever it changes (private mode aware)
  useEffect(() => {
    if (!activeWorkspaceId) return;
    const data = readWorkspaceData(activeWorkspaceId);
    saveWorkspaceData(
      activeWorkspaceId,
      { ...data, writeupNotes: JSON.stringify({ title, category, difficulty, tags, notes, flag }) },
      privateMode
    );
  }, [title, category, difficulty, tags, notes, flag, activeWorkspaceId, privateMode]);

  // Sync new history items in (up to 30)
  const visibleEntries = entries.filter(e => history.some(h => h.id === e.id) || e._manual);

  const removeEntry = (id) => setEntries(es => es.filter(e => e.id !== id));
  const editEntry   = (id, field, val) =>
    setEntries(es => es.map(e => e.id === id ? { ...e, [field]: val } : e));

  const md = useMemo(() => generateMarkdown({
    title, category, difficulty, tags, notes, flag,
    entries: visibleEntries,
  }), [title, category, difficulty, tags, notes, flag, visibleEntries]);

  const copyMd = () => {
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadMd = () => {
    const blob = new Blob([md], { type: "text/markdown" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    // Sanitize: remove path separators, null bytes, and shell-unsafe chars
    const safeName = (title || "writeup")
      .replace(/[/\\?%*:|"<>\0]/g, "")
      .replace(/\s+/g, "_")
      .replace(/\.{2,}/g, ".")
      .toLowerCase()
      .slice(0, 64)
      || "writeup";
    a.download = `${safeName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const CATS = ["crypto","web","forensics","pwn","rev","misc","steganography","osint","hardware"];
  const DIFFS = ["easy","medium","hard","insane"];

  return (
    <div>
      <div className="section-header">
        <h3>📝 CTF Writeup Generator</h3>
        <p>Collect your solution steps, annotate them, and export a clean Markdown writeup.</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

        {/* ── Left: editor ─────────────────────────────────────────────── */}
        <div>
          {/* Metadata */}
          <div className="card" style={{ marginBottom:12 }}>
            <div className="card-title" style={{ marginBottom:10 }}>Challenge Info</div>
            <label>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Mystery Cipher 2025" />

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:8 }}>
              <div>
                <label>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">— select —</option>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label>Difficulty</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                  <option value="">— select —</option>
                  {DIFFS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <label style={{ marginTop:8 }}>Tags (comma-separated)</label>
            <input value={tags} onChange={e => setTags(e.target.value)}
              placeholder="base64, xor, caesar" />

            <label style={{ marginTop:8 }}>Flag</label>
            <input value={flag} onChange={e => setFlag(e.target.value)}
              placeholder="flag{...}" style={{ fontFamily:"var(--font-mono)", color:"var(--green)" }} />
          </div>

          {/* Notes */}
          <div className="card" style={{ marginBottom:12 }}>
            <div className="card-title" style={{ marginBottom:6 }}>Overview / Notes</div>
            <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Describe the challenge, initial observations, and your approach…" />
          </div>

          {/* Step list */}
          <div className="card" style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div className="card-title">Solution Steps ({visibleEntries.length})</div>
              <span style={{ fontSize:11, color:"var(--text-3)" }}>
                From operation history — use tools to add steps automatically
              </span>
            </div>

            {visibleEntries.length === 0 ? (
              <div style={{ color:"var(--text-3)", fontSize:12, textAlign:"center", padding:20 }}>
                No steps yet. Run operations in any CryptoKit tool — they'll appear here automatically.
              </div>
            ) : (
              visibleEntries.map((e, i) => (
                <StepCard key={e.id} entry={e} index={i}
                  onEdit={editEntry} onRemove={removeEntry} />
              ))
            )}
          </div>
        </div>

        {/* ── Right: preview + export ───────────────────────────────────── */}
        <div>
          <div className="card" style={{ marginBottom:12, position:"sticky", top:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div className="card-title">Markdown Output</div>
              <div style={{ display:"flex", gap:6 }}>
                <button className={`tab${!preview?" active":""}`} style={{ fontSize:11, padding:"3px 10px" }}
                  onClick={() => setPreview(false)}>Raw</button>
                <button className={`tab${preview?" active":""}`} style={{ fontSize:11, padding:"3px 10px" }}
                  onClick={() => setPreview(true)}>Preview</button>
              </div>
            </div>

            {!preview ? (
              <pre style={{
                background:"var(--bg-output)", padding:12, borderRadius:6, fontSize:11,
                color:"var(--text-1)", whiteSpace:"pre-wrap", wordBreak:"break-all",
                overflow:"auto", maxHeight:520, fontFamily:"var(--font-mono)", lineHeight:1.6,
              }}>{md}</pre>
            ) : (
              <div style={{
                background:"var(--bg-card-2)", padding:14, borderRadius:6, fontSize:12,
                color:"var(--text-1)", overflow:"auto", maxHeight:520, lineHeight:1.8,
              }}>
                {md.split("\n").map((line, i) => {
                  if (line.startsWith("# "))  return <h1 key={i} style={{ color:"var(--accent)", fontSize:20, marginBottom:4 }}>{line.slice(2)}</h1>;
                  if (line.startsWith("## ")) return <h2 key={i} style={{ color:"var(--accent)", fontSize:16, margin:"12px 0 4px", borderBottom:"1px solid var(--border)" }}>{line.slice(3)}</h2>;
                  if (line.startsWith("### "))return <h3 key={i} style={{ color:"var(--text-1)", fontSize:13, margin:"8px 0 3px" }}>{line.slice(4)}</h3>;
                  if (line.startsWith("```")) return <hr key={i} style={{ border:"none", borderTop:"1px solid var(--border-sub)", margin:"3px 0" }}/>;
                  if (line.startsWith("|"))   return <div key={i} style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--text-2)", padding:"1px 0" }}>{line}</div>;
                  if (line.startsWith("*") && line.endsWith("*")) return <em key={i} style={{ color:"var(--text-3)", fontSize:11, display:"block" }}>{line.slice(1,-1)}</em>;
                  if (!line.trim()) return <div key={i} style={{ height:6 }} />;
                  return <div key={i} style={{ color:"var(--text-1)", padding:"1px 0" }}>{line}</div>;
                })}
              </div>
            )}

            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={downloadMd}>
                ⬇ Download .md
              </button>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={copyMd}>
                {copied ? "✓ Copied!" : "📋 Copy Markdown"}
              </button>
            </div>
          </div>

          {/* Tips */}
          <div className="card" style={{ fontSize:11, color:"var(--text-2)", lineHeight:1.7 }}>
            <div className="card-title" style={{ marginBottom:6 }}>Tips</div>
            <div>• Run any tool (Smart Solver, Hash Analyzer, etc.) and the step is recorded automatically.</div>
            <div>• Click any step to expand it and add an explanation note.</div>
            <div>• Click ✕ to remove steps you don't want in the writeup.</div>
            <div>• Fill in the Flag field to get a clean flag section at the bottom.</div>
            <div>• Use Preview tab to see how the Markdown will render.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
