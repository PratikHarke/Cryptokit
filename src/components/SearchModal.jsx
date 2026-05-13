import { useState, useEffect, useRef } from "react";
import { ALL_TOOLS } from "../lib/registry.js";

export default function SearchModal({ onSelect, onClose }) {
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const results = q.trim()
    ? ALL_TOOLS.filter(t =>
        t.label.toLowerCase().includes(q.toLowerCase()) ||
        t.desc.toLowerCase().includes(q.toLowerCase())  ||
        t.id.toLowerCase().includes(q.toLowerCase())    ||
        t.tags?.some(tag => tag.includes(q.toLowerCase()))
      ).slice(0, 8)
    : ALL_TOOLS.slice(0, 8);

  const TYPE_BADGE = { educational: "📚", ctf: "🏁", utility: "🔧" };

  return (
    <div className="search-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="search-box">
        <div className="search-input-row">
          <span style={{ color: "var(--accent)", fontSize: 16 }}>⌕</span>
          <input
            ref={ref}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search tools…"
            onKeyDown={e => {
              if (e.key === "Enter" && results[0]) { onSelect(results[0].id); onClose(); }
              if (e.key === "Escape") onClose();
            }}
          />
        </div>

        {results.map(tool => (
          <div
            key={tool.id}
            className="search-result"
            onClick={() => { onSelect(tool.id); onClose(); }}
          >
            <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{tool.icon || "·"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: "var(--text-1)", fontSize: 12 }}>{tool.label}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)" }}>{tool.desc}</div>
            </div>
            {tool.type && (
              <span style={{ fontSize: 10, color: "var(--text-3)" }}>{TYPE_BADGE[tool.type]}</span>
            )}
          </div>
        ))}

        <div className="search-footer">
          ↵ to open · ESC to close · {ALL_TOOLS.length} tools available
        </div>
      </div>
    </div>
  );
}
