import { useState, useRef } from "react";
import { SECTIONS } from "../lib/registry.js";

// ── Single tool item ──────────────────────────────────────────────────────────
function SidebarItem({ item, active, onClick }) {
  return (
    <div
      className={`sb-item${active ? " active" : ""}`}
      onClick={onClick}
      title={item.desc}
    >
      <span className="sb-item-icon">{item.icon || "·"}</span>
      <div className="sb-item-text">
        <div className="sb-item-label">{item.label}</div>
        <div className="sb-item-desc">{item.desc}</div>
      </div>
    </div>
  );
}

// ── Section with collapsible advanced items ───────────────────────────────────
function SidebarSection({ sec, activeId, beginner, collapsed, advExpanded, onCollapse, onAdvToggle, onSelect, searching }) {
  const filtered  = beginner && !searching;
  const basicItems = filtered ? sec.items.filter(i => i.basic)  : sec.items;
  const advItems   = filtered ? sec.items.filter(i => !i.basic) : [];
  const hasAdv     = advItems.length > 0;
  const advHasActive = advItems.some(i => i.id === activeId);
  const showAdv = advExpanded || advHasActive;

  return (
    <div>
      <div className="sb-section" onClick={onCollapse} title={`${collapsed ? "Expand" : "Collapse"} ${sec.label}`}>
        <span><span className="sb-section-icon">{sec.icon}</span>{sec.label}</span>
        <span className="sb-section-chevron">{collapsed ? "▸" : "▾"}</span>
      </div>

      {!collapsed && (
        <>
          {basicItems.map(item => (
            <SidebarItem key={item.id} item={item} active={activeId === item.id} onClick={() => onSelect(item.id)} />
          ))}

          {hasAdv && !showAdv && (
            <div className={`sb-more${advHasActive ? " active-flag" : ""}`} onClick={onAdvToggle}>
              ▸ {advItems.length} more tool{advItems.length !== 1 ? "s" : ""}
            </div>
          )}

          {hasAdv && showAdv && (
            <>
              <div style={{ borderTop: "1px solid var(--border-sub)", margin: "3px 10px", opacity: 0.5 }} />
              {advItems.map(item => (
                <SidebarItem key={item.id} item={item} active={activeId === item.id} onClick={() => onSelect(item.id)} />
              ))}
              {!advHasActive && (
                <div className="sb-more" onClick={onAdvToggle}>▴ Show fewer</div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Sidebar root ──────────────────────────────────────────────────────────────
export default function Sidebar({ activeId, theme, beginner, historyCount, onThemeToggle, onBeginnerToggle, onSelect, onSearchOpen }) {
  const [sidebarQ, setSidebarQ]         = useState("");
  const [collapsedSec, setCollapsedSec] = useState({});
  const [expandedAdv, setExpandedAdv]   = useState({});
  const sbSearchRef = useRef(null);

  const isSearching = sidebarQ.trim().length > 0;
  const filteredSections = isSearching
    ? SECTIONS.map(s => ({
        ...s,
        items: s.items.filter(i =>
          i.label.toLowerCase().includes(sidebarQ.toLowerCase()) ||
          i.desc.toLowerCase().includes(sidebarQ.toLowerCase())
        ),
      })).filter(s => s.items.length > 0)
    : SECTIONS;

  const handleSelect = (id) => { onSelect(id); setSidebarQ(""); };

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sb-logo">
        <div className="sb-logo-inner">
          <div>
            <h1>⬡ CRYPTKIT</h1>
            <p>CTF · CRYPTO · ANALYSIS</p>
          </div>
          <button
            onClick={onThemeToggle}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-3)", cursor: "pointer", fontSize: 13, padding: "3px 6px" }}
            title="Toggle theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </div>

      {/* Filter search */}
      <div style={{ padding: "8px 8px 6px", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 5, padding: "5px 8px", cursor: "text" }}
          onClick={() => sbSearchRef.current?.focus()}
        >
          <span style={{ color: "var(--text-3)", fontSize: 12 }}>⌕</span>
          <input
            ref={sbSearchRef}
            value={sidebarQ}
            onChange={e => setSidebarQ(e.target.value)}
            placeholder="Filter tools…"
            style={{ background: "none", border: "none", outline: "none", color: "var(--text-1)", fontSize: 11, padding: 0, width: "100%", fontFamily: "var(--font-mono)" }}
          />
          {sidebarQ && (
            <span onClick={e => { e.stopPropagation(); setSidebarQ(""); }} style={{ color: "var(--text-3)", cursor: "pointer", fontSize: 12 }}>×</span>
          )}
        </div>
        <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 3, textAlign: "center", letterSpacing: "1px", fontFamily: "var(--font-mono)" }}>
          CTRL+K FOR FULL SEARCH
        </div>
      </div>

      {/* Tool sections */}
      {filteredSections.map(sec => (
        <SidebarSection
          key={sec.id}
          sec={sec}
          activeId={activeId}
          beginner={beginner}
          collapsed={collapsedSec[sec.id] || false}
          advExpanded={expandedAdv[sec.id] || false}
          onCollapse={() => setCollapsedSec(p => ({ ...p, [sec.id]: !p[sec.id] }))}
          onAdvToggle={() => setExpandedAdv(p => ({ ...p, [sec.id]: !p[sec.id] }))}
          onSelect={handleSelect}
          searching={isSearching}
        />
      ))}

      {/* Session section */}
      {!isSearching && (
        <div>
          <div className="sb-section" style={{ cursor: "default" }}>
            <span><span className="sb-section-icon">📋</span>Session</span>
          </div>
          {[
            { id: "history", icon: "⏱", label: "History",       desc: `${historyCount} operations` },
            { id: "writeup", icon: "📝", label: "CTF Writeup Generator", desc: "Export solution as Markdown" },
          ].map(item => (
            <SidebarItem key={item.id} item={item} active={activeId === item.id} onClick={() => handleSelect(item.id)} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="sb-footer">
        <div className="sb-footer-row">
          <button
            onClick={onBeginnerToggle}
            className="btn btn-ghost btn-sm"
            style={{ flex: 1, fontSize: 9, letterSpacing: "1px", borderColor: beginner ? "var(--accent)" : undefined, color: beginner ? "var(--accent)" : undefined }}
            title={beginner ? "Switch to Expert mode" : "Switch to Guided mode"}
          >
            {beginner ? "🎓 GUIDED" : "⚡ EXPERT"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onSearchOpen} style={{ fontSize: 9, letterSpacing: "1px" }} title="Full search (Ctrl+K)">
            ⌕
          </button>
        </div>
        <div className="sb-stat">
          OPS <span>{historyCount}</span> · TOOLS <span>{SECTIONS.flatMap(s => s.items).length}</span>
        </div>
      </div>
    </nav>
  );
}
