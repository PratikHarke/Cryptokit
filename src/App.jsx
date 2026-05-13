import React, { useState, useCallback, useEffect, useRef, Suspense } from "react";
import styles from "./styles.js";

import { TOOL_MAP, SECTIONS, ALL_TOOLS } from "./lib/registry.js";
import { saveSession, loadSession, formatSavedAt, saveFullSession, loadFullSession } from "./lib/session.js";
import {
  ensureDefaultWorkspace,
  getActiveWorkspaceId,
  switchWorkspace,
  getPrivateMode,
  setPrivateMode,
} from "./lib/workspace.js";
import Sidebar        from "./components/Sidebar.jsx";
import SearchModal    from "./components/SearchModal.jsx";
import WorkspaceBar   from "./components/WorkspaceBar.jsx";
import ErrorBoundary  from "./components/ErrorBoundary.jsx";
import HistoryView    from "./views/HistoryView.jsx";
import WriteupView    from "./views/WriteupView.jsx";

export const ThemeContext    = React.createContext("dark");
export const BeginnerContext = React.createContext(false);

// ── Persistence ───────────────────────────────────────────────────────────────
// Preferences (active tool, theme, mode) persist to disk.
// History stays in memory by default; payloads are never saved.
// "Save session" toggle in HistoryView writes only op labels + timestamps.

const PREFS_KEY   = "cryptokit_prefs";
const HISTORY_KEY = "cryptokit_history";

function loadPrefs() {
  try { const s = localStorage.getItem(PREFS_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function savePrefs(active) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify({ active })); } catch {}
}
function persistHistory(h) {
  // Strip payloads — only labels and timestamps are safe to persist
  const safe = h.slice(0, 50).map(e => ({
    id: e.id, op: e.op, timestamp: e.timestamp, status: e.status,
    input: "[saved]", output: "[saved]",
  }));
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(safe)); } catch {}
}
function clearPersistedHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
}
function getURLTool() {
  const p = new URLSearchParams(window.location.hash.slice(1));
  return p.get("tool") || null;
}
function setURLTool(id) {
  const p = new URLSearchParams();
  p.set("tool", id);
  window.history.replaceState(null, "", "#" + p.toString());
}

// ── Tool loading indicator ────────────────────────────────────────────────────
function ToolSkeleton() {
  return (
    <div style={{ padding: "2rem", color: "var(--text-3)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
      Loading…
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const prefs = loadPrefs();

  // Workspace init — ensures at least one workspace exists
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => {
    const ws = ensureDefaultWorkspace();
    return ws.id;
  });
  const [privateMode, setPrivateModeState] = useState(() => getPrivateMode());

  const handlePrivateModeChange = (val) => {
    setPrivateModeState(val);
    setPrivateMode(val);
  };

  const handleWorkspaceSwitch = (id) => {
    switchWorkspace(id);
    setActiveWorkspaceId(id);
    // Clear in-memory history on workspace switch — data is workspace-scoped
    setHistory([]);
  };

  const [active,      setActive]      = useState(getURLTool() || prefs?.active || "smartsolver");
  const [history,     setHistory]     = useState([]);
  const [saveHistory, setSaveHistory] = useState(false);
  const [sessionTs,   setSessionTs]   = useState(() => loadSession()?.savedAt ?? null);
  const [sessionToast,setSessionToast]= useState(null);
  const [pipelineQueue, setPipelineQueue] = useState(null);
  const [fullSessionMode, setFullSessionMode] = useState(() =>
    localStorage.getItem("ck_full_session_mode") === "true"
  );
  const [theme,       setTheme]       = useState(() => localStorage.getItem("ck_theme") || "dark");
  const [beginner,    setBeginner]    = useState(() => localStorage.getItem("ck_beginner") === "true");
  const [searchOpen,  setSearchOpen]  = useState(false);

  // Sync theme to body + localStorage
  useEffect(() => {
    document.body.style.background = theme === "light" ? "#f0f5ff" : "#030c1a";
    localStorage.setItem("ck_theme", theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem("ck_beginner", beginner); }, [beginner]);
  useEffect(() => { savePrefs(active); setURLTool(active); }, [active]);
  useEffect(() => { if (saveHistory) persistHistory(history); }, [history, saveHistory]);

  // Keyboard shortcuts
  // Ctrl+K → open search | Ctrl+Shift+S → save session | Ctrl+Shift+P → block print
  const saveSessionRef = useRef(null);
  useEffect(() => { saveSessionRef.current = handleSaveSession; });

  useEffect(() => {
    const handler = e => {
      const ctrl = e.ctrlKey || e.metaKey;
      // Ctrl+K → search
      if (ctrl && e.key === "k") { e.preventDefault(); e.stopPropagation(); setSearchOpen(true); return; }
      // Ctrl+Shift+S → save session (prevent browser "Save Page As")
      if (ctrl && e.shiftKey && e.key === "S") { e.preventDefault(); e.stopPropagation(); saveSessionRef.current?.(); return; }
      // Ctrl+Shift+P → DO NOT open browser print dialog
      if (ctrl && e.shiftKey && e.key === "P") { e.preventDefault(); e.stopPropagation(); return; }
      // Ctrl+Enter → dispatch a custom "ck:run" event that active views can listen to
      if (ctrl && e.key === "Enter") { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent("ck:run")); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Canonical history entry: { id, op, input, output, timestamp, status }
  const addHistory = useCallback((op, input, output, status = "ok") => {
    const entry = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      op,
      input:     typeof input  === "string" ? input.slice(0, 200)  : String(input  ?? ""),
      output:    typeof output === "string" ? output.slice(0, 500) : String(output ?? ""),
      timestamp: new Date().toISOString(),
      status,
    };
    setHistory(h => [entry, ...h.slice(0, 99)]);
  }, []);

  const navigate = useCallback((id) => {
    if (TOOL_MAP[id] || id === "history" || id === "writeup") setActive(id);
  }, []);

  const handleSaveSession = () => {
    const ok = saveSession({ active, historyLabels: history.slice(0,20).map(h=>h.op) });
    if (fullSessionMode) saveFullSession({ active, pipelineQueue });
    if (ok) {
      const ts = new Date().toISOString();
      setSessionTs(ts);
      setSessionToast("Session saved" + (fullSessionMode ? " (full mode)" : "") + " — " + formatSavedAt(ts));
      setTimeout(() => setSessionToast(null), 2500);
    }
  };

  const handleLoadSession = () => {
    const s = loadSession();
    if (!s) return;
    if (s.active && (TOOL_MAP[s.active] || s.active === "history" || s.active === "writeup"))
      setActive(s.active);
    if (fullSessionMode) {
      const full = loadFullSession();
      if (full?.pipelineQueue) setPipelineQueue(full.pipelineQueue);
    }
    setSessionToast("Session restored from " + formatSavedAt(s.savedAt));
    setTimeout(() => setSessionToast(null), 2500);
  };

  const handleSendToPipeline = useCallback((steps, input) => {
    setPipelineQueue({ steps, input });
    setActive("manualpipeline");
  }, []);

  const handleSelect = (id) => setActive(id);

  // Resolve the active tool's lazy component
  const tool       = TOOL_MAP[active];
  const ToolView   = tool?.component ?? null;
  const toolSection = SECTIONS.find(s => s.items.some(i => i.id === active));

  const viewProps = {
    addHistory,
    onNavigate: navigate,
    onSendToPipeline: handleSendToPipeline,
    pipelineQueue,
    onClearPipelineQueue: () => setPipelineQueue(null),
    activeWorkspaceId,
    privateMode,
  };

  return (
    <ThemeContext.Provider value={theme}>
      <BeginnerContext.Provider value={beginner}>
        <style>{styles}</style>
        <div className={`app theme-${theme}`}>

          {searchOpen && (
            <SearchModal onSelect={handleSelect} onClose={() => setSearchOpen(false)} />
          )}

          <Sidebar
            activeId={active}
            theme={theme}
            beginner={beginner}
            historyCount={history.length}
            onThemeToggle={() => setTheme(t => t === "dark" ? "light" : "dark")}
            onBeginnerToggle={() => setBeginner(v => !v)}
            onSelect={handleSelect}
            onSearchOpen={() => setSearchOpen(true)}
          />

          <div className="main">
            {/* Topbar */}
            <div className="topbar">
              <div>
                {toolSection && (
                  <div className="topbar-crumb">
                    {toolSection.icon} <span>{toolSection.label}</span>
                  </div>
                )}
                <h2>
                  {active === "history" ? "Operation History"
                    : active === "writeup" ? "CTF Writeup Generator"
                    : (tool?.label || "—")}
                </h2>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <label style={{ fontSize:10, color:"var(--text-3)", display:"flex", gap:4,
                  alignItems:"center", cursor:"pointer", whiteSpace:"nowrap" }}
                  data-tooltip="Also save inputs & pipeline (less private)">
                  <input type="checkbox" checked={fullSessionMode}
                    onChange={e => {
                      setFullSessionMode(e.target.checked);
                      localStorage.setItem("ck_full_session_mode", e.target.checked);
                    }} />
                  Full save
                </label>
                <button className="btn btn-ghost btn-sm" onClick={handleSaveSession}
                  data-tooltip={fullSessionMode ? "Save session (inputs + pipeline)" : "Save current tool to session"}
                  style={{ fontSize:11 }}>
                  💾 Save
                </button>
                {sessionTs && (
                  <button className="btn btn-ghost btn-sm" onClick={handleLoadSession}
                    data-tooltip={`Restore session from ${formatSavedAt(sessionTs)}`}
                    style={{ fontSize:11 }}>
                    ↩ {formatSavedAt(sessionTs)}
                  </button>
                )}
                <div className="topbar-sep" />
                <button className="btn btn-ghost btn-sm" onClick={() => setSearchOpen(true)} style={{ display: "flex", alignItems: "center", gap: 5 }} data-tooltip="Search all tools (Ctrl+K)">
                  ⌕ <span style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "1px" }}>CTRL+K</span>
                </button>
                <button className="btn btn-ghost btn-sm" data-tooltip="Copy link to this tool" onClick={() => navigator.clipboard.writeText(window.location.href)} style={{ fontSize: 11 }}>
                  🔗
                </button>
              </div>
            </div>

            {/* Session toast */}
            {sessionToast && (
              <div className="session-toast">
                💾 {sessionToast}
              </div>
            )}

            {/* Workspace bar — always visible */}
            <WorkspaceBar
              activeWorkspaceId={activeWorkspaceId}
              privateMode={privateMode}
              onWorkspaceSwitch={handleWorkspaceSwitch}
              onPrivateModeChange={handlePrivateModeChange}
              onToast={(msg) => { setSessionToast(msg); setTimeout(() => setSessionToast(null), 2500); }}
            />

            {/* Content */}
            <div className="content">
              {/* Global ethical use notice (shown once, dismissible) */}
              {(() => {
                const [dismissed, setDismissed] = React.useState(() => sessionStorage.getItem("ck_disclaimer") === "1");
                if (dismissed) return null;
                return (
                  <div style={{ background:"#1e1a0e", border:"1px solid #a16207", borderRadius:6, padding:"9px 14px", marginBottom:14, fontSize:11, color:"#fbbf24", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span>⚠️ <strong>CryptoKit is for education, CTF competitions, and authorized analysis only.</strong> Do not use against systems or data you do not own.</span>
                    <button onClick={() => { sessionStorage.setItem("ck_disclaimer","1"); setDismissed(true); }} style={{ background:"none", border:"none", color:"#fbbf24", cursor:"pointer", fontSize:14, marginLeft:10 }}>✕</button>
                  </div>
                );
              })()}
              <ErrorBoundary key={active}>
                {active === "history" && (
                  <HistoryView
                    history={history}
                    saveHistory={saveHistory}
                    onToggleSave={() => setSaveHistory(v => !v)}
                    clearHistory={() => { setHistory([]); clearPersistedHistory(); }}
                  />
                )}
                {active === "writeup" && <WriteupView history={history}
                  activeWorkspaceId={activeWorkspaceId} privateMode={privateMode} />}
                {active !== "history" && active !== "writeup" && ToolView && (
                  <Suspense fallback={<ToolSkeleton />}>
                    <ToolView {...viewProps} />
                  </Suspense>
                )}
                {active !== "history" && active !== "writeup" && !ToolView && (
                  <div className="empty">
                    <div style={{ fontSize: 32, marginBottom: 12 }}>⬡</div>
                    <div>Tool not found: <code>{active}</code></div>
                  </div>
                )}
              </ErrorBoundary>
            </div>
          </div>

        </div>
      </BeginnerContext.Provider>
    </ThemeContext.Provider>
  );
}
