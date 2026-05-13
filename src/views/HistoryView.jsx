// HistoryView — reads the canonical history entry shape:
//   { id, op, input, output, timestamp, status }

function formatTs(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return iso; }
}

export default function HistoryView({ history, clearHistory, saveHistory, onToggleSave }) {
  return (
    <div>
      <div
        className="section-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <div>
          <h3>Operation History</h3>
          <p>All operations performed this session.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {history.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={clearHistory}>Clear</button>
          )}
        </div>
      </div>

      {/* Privacy notice + opt-in save toggle */}
      <div
        className="info-box"
        style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
      >
        <div style={{ fontSize: 12 }}>
          <strong style={{ color: "var(--accent)" }}>Privacy:</strong>{" "}
          History is in-memory only. Inputs and outputs are never saved to disk by default.
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
          <input
            type="checkbox"
            checked={saveHistory}
            onChange={onToggleSave}
            style={{ cursor: "pointer" }}
          />
          Save session
        </label>
      </div>

      <div className="card">
        {history.length === 0 && (
          <div className="empty">No operations yet. Run something!</div>
        )}

        {history.map((entry) => (
          <div key={entry.id} className="history-item">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <div className="history-op">{entry.op}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                {entry.status === "error" && (
                  <span style={{ fontSize: 10, color: "#f87171", background: "#1c0a0a", borderRadius: 3, padding: "1px 6px" }}>
                    error
                  </span>
                )}
                <div className="history-meta">{formatTs(entry.timestamp)}</div>
              </div>
            </div>

            {entry.input && (
              <div className="history-preview">{entry.input}</div>
            )}

            {entry.output && (
              <div style={{
                fontSize: 12,
                color: entry.status === "error" ? "#f87171" : "#86efac",
                fontFamily: "var(--font-mono)",
                marginTop: 2,
                wordBreak: "break-all",
              }}>
                {entry.output.length > 120 ? entry.output.slice(0, 120) + "…" : entry.output}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
