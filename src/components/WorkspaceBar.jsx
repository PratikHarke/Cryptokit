// ─── WorkspaceBar.jsx ─────────────────────────────────────────────────────────
// Renders below the topbar. Shows current workspace, switcher, privacy toggle,
// and clear controls. Entirely local — no backend, no auth.

import { useState, useRef, useEffect } from "react";
import {
  listWorkspaces,
  createWorkspace,
  renameWorkspace,
  switchWorkspace,
  deleteWorkspace,
  clearWorkspaceData,
  clearAllWorkspaceData,
} from "../lib/workspace.js";

// ── Confirmation modal ────────────────────────────────────────────────────────
function ConfirmModal({ title, body, confirmLabel = "Confirm", danger = true, onConfirm, onCancel }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:99999,
      background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center",
    }} onClick={onCancel}>
      <div style={{
        background:"var(--bg-card)", border:"1px solid var(--border)",
        borderRadius:10, padding:"24px 28px", maxWidth:380, width:"90%",
        boxShadow:"0 8px 40px rgba(0,0,0,0.5)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:15, fontWeight:700, color:"var(--text-1)", marginBottom:8 }}>{title}</div>
        <div style={{ fontSize:12, color:"var(--text-2)", marginBottom:20, lineHeight:1.6 }}>{body}</div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button className="btn btn-ghost" onClick={onCancel} style={{ fontSize:12 }}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{
              background: danger ? "var(--red)" : "var(--accent)",
              color:"#fff", border:"none", borderRadius:5,
              padding:"6px 16px", cursor:"pointer", fontSize:12, fontWeight:600,
            }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Workspace name editor ─────────────────────────────────────────────────────
function WorkspaceNameEditor({ workspace, onRename, onClose }) {
  const [name, setName] = useState(workspace.name);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.select(); }, []);

  const commit = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== workspace.name) onRename(trimmed);
    onClose();
  };

  return (
    <input
      ref={inputRef}
      value={name}
      onChange={e => setName(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") onClose(); }}
      style={{
        fontFamily:"var(--font-mono)", fontSize:12, fontWeight:700,
        background:"var(--bg-input)", border:"1px solid var(--accent)",
        color:"var(--text-1)", borderRadius:4, padding:"2px 6px",
        width:160, outline:"none",
      }}
      maxLength={60}
    />
  );
}

// ── Main WorkspaceBar ─────────────────────────────────────────────────────────
export default function WorkspaceBar({
  activeWorkspaceId,
  privateMode,
  onWorkspaceSwitch,
  onPrivateModeChange,
  onToast,
}) {
  const [workspaces,   setWorkspaces]   = useState(() => listWorkspaces());
  const [dropOpen,     setDropOpen]     = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [modal,        setModal]        = useState(null); // { type, id? }
  const dropRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return;
    const h = (e) => { if (!dropRef.current?.contains(e.target)) setDropOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [dropOpen]);

  const refresh = () => setWorkspaces(listWorkspaces());

  const activeWs = workspaces.find(w => w.id === activeWorkspaceId);

  const handleCreate = () => {
    const ws = createWorkspace("Workspace " + (workspaces.length + 1));
    refresh();
    onWorkspaceSwitch(ws.id);
    setDropOpen(false);
    setEditingId(ws.id); // immediately enter rename mode
  };

  const handleRename = (id, newName) => {
    renameWorkspace(id, newName);
    refresh();
  };

  const handleSwitch = (id) => {
    switchWorkspace(id);
    onWorkspaceSwitch(id);
    setDropOpen(false);
  };

  const handleDelete = (id) => {
    setModal({ type: "delete", id });
    setDropOpen(false);
  };

  const handleClearCurrent = () => {
    setModal({ type: "clearCurrent" });
    setDropOpen(false);
  };

  const handleClearAll = () => {
    setModal({ type: "clearAll" });
  };

  const confirmModal = () => {
    if (!modal) return;

    if (modal.type === "delete") {
      const newActive = deleteWorkspace(modal.id);
      refresh();
      onWorkspaceSwitch(newActive.id);
      onToast(`🗑 Workspace deleted`);
    }

    if (modal.type === "clearCurrent") {
      clearWorkspaceData(activeWorkspaceId);
      onToast(`🗑 Workspace data cleared`);
    }

    if (modal.type === "clearAll") {
      clearAllWorkspaceData();
      // Re-create a default workspace after nuclear clear
      const fresh = createWorkspace("Default");
      refresh();
      onWorkspaceSwitch(fresh.id);
      onToast(`🗑 All CryptoKit data cleared`);
    }

    setModal(null);
  };

  return (
    <>
      {/* Confirmation modal */}
      {modal && (
        <ConfirmModal
          title={
            modal.type === "clearAll"     ? "Clear all CryptoKit data?" :
            modal.type === "clearCurrent" ? "Clear workspace data?" :
                                            "Delete workspace?"
          }
          body={
            modal.type === "clearAll"
              ? "This removes all workspaces, history, and preferences from localStorage. This cannot be undone."
              : modal.type === "clearCurrent"
              ? "Clears all history and pipeline data in this workspace. The workspace itself is kept."
              : "Deletes this workspace and all its data. Cannot be undone."
          }
          confirmLabel={modal.type === "clearAll" ? "Clear everything" : modal.type === "clearCurrent" ? "Clear workspace" : "Delete"}
          onConfirm={confirmModal}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Workspace bar */}
      <div style={{
        display:"flex", alignItems:"center", gap:8,
        padding:"5px 16px", borderBottom:"1px solid var(--border-sub)",
        background:"var(--bg-app)", fontSize:11, flexWrap:"wrap",
        position:"relative",
      }}>

        {/* Privacy guarantee — always visible */}
        <span style={{
          fontSize:10, color:"var(--text-3)", display:"flex", alignItems:"center", gap:4,
          borderRight:"1px solid var(--border-sub)", paddingRight:10, marginRight:2,
        }}>
          🔒 Local only — no data sent to any server
        </span>

        {/* Workspace switcher */}
        <div ref={dropRef} style={{ position:"relative" }}>
          <button
            onClick={() => setDropOpen(o => !o)}
            style={{
              display:"flex", alignItems:"center", gap:6,
              background:"var(--bg-hover)", border:"1px solid var(--border)",
              borderRadius:5, padding:"3px 10px", cursor:"pointer",
              fontSize:11, color:"var(--text-1)", fontWeight:600,
              fontFamily:"var(--font-mono)", maxWidth:200,
            }}
            data-tooltip="Switch workspace">
            <span style={{ color:"var(--accent)" }}>⬡</span>
            <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:140 }}>
              {activeWs?.name ?? "Default"}
            </span>
            <span style={{ color:"var(--text-3)", fontSize:9 }}>▾</span>
          </button>

          {/* Dropdown */}
          {dropOpen && (
            <div style={{
              position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:9999,
              background:"var(--bg-card)", border:"1px solid var(--border)",
              borderRadius:8, boxShadow:"0 8px 24px rgba(0,0,0,0.4)",
              minWidth:220, overflow:"hidden",
            }}>
              {/* Workspace list */}
              {workspaces.map(ws => (
                <div key={ws.id} style={{
                  display:"flex", alignItems:"center", gap:6,
                  padding:"7px 10px",
                  background: ws.id === activeWorkspaceId ? "var(--bg-active)" : "transparent",
                  borderBottom:"1px solid var(--border-sub)",
                }}>
                  {editingId === ws.id ? (
                    <WorkspaceNameEditor
                      workspace={ws}
                      onRename={n => handleRename(ws.id, n)}
                      onClose={() => setEditingId(null)}
                    />
                  ) : (
                    <span
                      style={{ flex:1, color:"var(--text-1)", fontSize:11, cursor:"pointer",
                        fontWeight: ws.id === activeWorkspaceId ? 700 : 400,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}
                      onClick={() => handleSwitch(ws.id)}>
                      {ws.id === activeWorkspaceId ? "● " : "○ "}{ws.name}
                    </span>
                  )}
                  <button
                    onClick={() => setEditingId(ws.id)}
                    style={{ background:"none", border:"none", color:"var(--text-3)",
                      cursor:"pointer", fontSize:11, padding:"0 2px", lineHeight:1 }}
                    data-tooltip="Rename" title="Rename">✎</button>
                  {workspaces.length > 1 && (
                    <button
                      onClick={() => handleDelete(ws.id)}
                      style={{ background:"none", border:"none", color:"var(--text-3)",
                        cursor:"pointer", fontSize:11, padding:"0 2px", lineHeight:1 }}
                      data-tooltip="Delete workspace" title="Delete">🗑</button>
                  )}
                </div>
              ))}

              {/* Actions */}
              <div style={{ padding:"6px 8px", display:"flex", gap:4, flexWrap:"wrap" }}>
                <button className="btn btn-ghost btn-sm" onClick={handleCreate}
                  style={{ fontSize:10, flex:1 }}>+ New</button>
                <button className="btn btn-ghost btn-sm" onClick={handleClearCurrent}
                  style={{ fontSize:10, flex:1, color:"var(--orange)" }}>
                  Clear workspace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex:1 }} />

        {/* Private mode toggle */}
        <label style={{
          fontSize:10, display:"flex", gap:5, alignItems:"center", cursor:"pointer",
          color: privateMode ? "var(--text-3)" : "var(--orange)",
          userSelect:"none",
        }}
          data-tooltip={privateMode
            ? "Inputs are NOT stored. Toggle to persist workspace data."
            : "Inputs are being saved to this workspace."}>
          <input
            type="checkbox"
            checked={!privateMode}
            onChange={e => onPrivateModeChange(!e.target.checked)}
          />
          {privateMode ? "Private mode" : "Saving inputs"}
        </label>

        {/* Divider */}
        <div style={{ width:1, height:14, background:"var(--border-sub)" }} />

        {/* Clear all button */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleClearAll}
          style={{ fontSize:10, color:"var(--red)", opacity:.8 }}
          data-tooltip="Delete all workspaces and data from this browser">
          Clear all data
        </button>
      </div>
    </>
  );
}
