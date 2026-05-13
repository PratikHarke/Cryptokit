// ─── CryptoKit Workspace System ───────────────────────────────────────────────
// localStorage only. No IndexedDB, no backend, no auth.
// All operations wrapped in try/catch — quota/private-mode failures are silent.
//
// Storage keys:
//   ck_workspace_list         → JSON array of workspace metadata
//   ck_workspace_<id>         → JSON workspace data object
//   ck_workspace_active       → string id of the currently active workspace
//   ck_private_mode           → "true" | "false" — whether to store inputs

// ── Schema ────────────────────────────────────────────────────────────────────
// Workspace:
// {
//   id:        string,   // nanoid-style: Date.now() + random hex
//   name:      string,   // user-editable
//   createdAt: number,   // unix ms
//   updatedAt: number,   // unix ms
//   data: {
//     solverHistory: [],  // { timestamp, method, outputPreview }[]
//     pipeline:      [],  // pipeline step objects
//     writeupNotes:  string,
//   }
// }

const LIST_KEY   = "ck_workspace_list";
const DATA_KEY   = (id) => `ck_workspace_${id}`;
const ACTIVE_KEY = "ck_workspace_active";
const PRIV_KEY   = "ck_private_mode";

// ── ID generation — no external dep ──────────────────────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Metadata list ─────────────────────────────────────────────────────────────
function readList() {
  try { return JSON.parse(localStorage.getItem(LIST_KEY) ?? "[]"); }
  catch { return []; }
}
function writeList(list) {
  try { localStorage.setItem(LIST_KEY, JSON.stringify(list)); } catch {}
}

// ── Workspace data ────────────────────────────────────────────────────────────
function emptyData() {
  return { solverHistory: [], pipeline: [], writeupNotes: "" };
}

export function readWorkspaceData(id) {
  try {
    const raw = localStorage.getItem(DATA_KEY(id));
    return raw ? JSON.parse(raw) : emptyData();
  } catch { return emptyData(); }
}

function writeWorkspaceData(id, data) {
  try { localStorage.setItem(DATA_KEY(id), JSON.stringify(data)); } catch {}
}

// ── Active workspace ──────────────────────────────────────────────────────────
export function getActiveWorkspaceId() {
  try { return localStorage.getItem(ACTIVE_KEY) ?? null; }
  catch { return null; }
}

function setActiveWorkspaceId(id) {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/** List all workspace metadata (id + name + dates). No heavy data loaded. */
export function listWorkspaces() {
  return readList();
}

/**
 * Create a new workspace, make it active, return it.
 * If no workspaces exist yet, this becomes the default.
 */
export function createWorkspace(name = "New Workspace") {
  const id  = genId();
  const now = Date.now();
  const meta = { id, name: name.slice(0, 60), createdAt: now, updatedAt: now };
  const list = readList();
  writeList([...list, meta]);
  writeWorkspaceData(id, emptyData());
  setActiveWorkspaceId(id);
  return meta;
}

/** Rename a workspace. Returns updated metadata or null on failure. */
export function renameWorkspace(id, newName) {
  const list = readList();
  const idx  = list.findIndex(w => w.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], name: newName.slice(0, 60), updatedAt: Date.now() };
  writeList(list);
  return list[idx];
}

/** Switch active workspace. Returns the workspace metadata. */
export function switchWorkspace(id) {
  const list = readList();
  const ws   = list.find(w => w.id === id);
  if (!ws) return null;
  setActiveWorkspaceId(id);
  return ws;
}

/**
 * Delete a workspace.
 * If the deleted workspace was active, switches to the first remaining one
 * (or creates a fresh default workspace if none remain).
 * Returns the new active workspace metadata.
 */
export function deleteWorkspace(id) {
  let list   = readList();
  list       = list.filter(w => w.id !== id);
  writeList(list);
  try { localStorage.removeItem(DATA_KEY(id)); } catch {}

  const activeId = getActiveWorkspaceId();
  if (activeId === id) {
    if (list.length > 0) {
      setActiveWorkspaceId(list[0].id);
      return list[0];
    }
    // No workspaces left — create a default
    return createWorkspace("Default");
  }
  return list.find(w => w.id === activeId) ?? (list[0] || createWorkspace("Default"));
}

/** Clear all data in the current workspace, keeping the workspace itself. */
export function clearWorkspaceData(id) {
  writeWorkspaceData(id, emptyData());
  const list = readList();
  const idx  = list.findIndex(w => w.id === id);
  if (idx >= 0) { list[idx].updatedAt = Date.now(); writeList(list); }
}

/**
 * Update workspace data (solver history, pipeline, writeup notes).
 * Only persists if private mode is OFF.
 */
export function saveWorkspaceData(id, data, privateMode = true) {
  if (privateMode) return; // Do NOT persist inputs when private mode is on
  writeWorkspaceData(id, data);
  const list = readList();
  const idx  = list.findIndex(w => w.id === id);
  if (idx >= 0) { list[idx].updatedAt = Date.now(); writeList(list); }
}

/** Append a solver history entry (only when private mode is OFF). */
export function appendSolverHistory(id, entry, privateMode = true) {
  if (privateMode) return;
  const data = readWorkspaceData(id);
  data.solverHistory = [entry, ...(data.solverHistory ?? [])].slice(0, 200);
  writeWorkspaceData(id, data);
}

// ── Ensure at least one workspace exists (call on app init) ──────────────────
export function ensureDefaultWorkspace() {
  const list = readList();
  if (list.length === 0) return createWorkspace("Default");
  const activeId = getActiveWorkspaceId();
  const active   = list.find(w => w.id === activeId);
  if (!active) {
    setActiveWorkspaceId(list[0].id);
    return list[0];
  }
  return active;
}

// ── Private mode ──────────────────────────────────────────────────────────────
export function getPrivateMode() {
  try { return localStorage.getItem(PRIV_KEY) !== "false"; } // default ON
  catch { return true; }
}
export function setPrivateMode(value) {
  try { localStorage.setItem(PRIV_KEY, value ? "true" : "false"); } catch {}
}

// ── Clear all CryptoKit data (nuclear option) ─────────────────────────────────
export function clearAllWorkspaceData() {
  let count = 0;
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("ck_")) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => { localStorage.removeItem(k); count++; });
  } catch {}
  return count;
}
