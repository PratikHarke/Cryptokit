// ─── Session persistence (localStorage) ──────────────────────────────────────
// Saves: active tool, smart solver input, pipeline steps + input.
// All ops are wrapped in try/catch — storage quota or private-mode failures
// must never crash the app.

const SESSION_KEY = "ck_session_v1";

export function saveSession(data) {
  try {
    const payload = {
      ...data,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    return true;
  } catch { return false; }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); return true; }
  catch { return false; }
}

export function formatSavedAt(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month:"short", day:"numeric", hour:"2-digit", minute:"2-digit",
    });
  } catch { return iso; }
}

// ─── Full session (opt-in — stores input + pipeline steps) ───────────────────
const FULL_SESSION_KEY = "ck_session_full_v1";

export function saveFullSession(data) {
  try {
    localStorage.setItem(FULL_SESSION_KEY, JSON.stringify({
      ...data, savedAt: new Date().toISOString(),
    }));
    return true;
  } catch { return false; }
}

export function loadFullSession() {
  try {
    const raw = localStorage.getItem(FULL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearFullSession() {
  try { localStorage.removeItem(FULL_SESSION_KEY); return true; }
  catch { return false; }
}

/**
 * Nuclear option — wipe ALL CryptoKit keys from localStorage.
 * Returns the count of keys removed.
 */
export function clearAllData() {
  const CK_PREFIX = ["ck_session", "ck_theme", "ck_beginner", "ck_full_session"];
  let removed = 0;
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && CK_PREFIX.some(p => k.startsWith(p))) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => { localStorage.removeItem(k); removed++; });
  } catch { /* storage unavailable — that's fine */ }
  return removed;
}
