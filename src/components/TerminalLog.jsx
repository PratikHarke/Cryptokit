import { useEffect, useRef } from "react";

// ── Log entry types ───────────────────────────────────────────────────────────
// type: "cmd" | "ok" | "info" | "warn" | "error" | "flag" | "dim" | "sep"

const TYPE_STYLE = {
  cmd:   { color: "#00d4ff", prefix: "$ " },
  ok:    { color: "#00e87a", prefix: "✓ " },
  info:  { color: "#94a3b8", prefix: "  " },
  warn:  { color: "#fbbf24", prefix: "⚠ " },
  error: { color: "#f87171", prefix: "✗ " },
  flag:  { color: "#00e87a", prefix: "🏁 ", bold: true },
  dim:   { color: "#334155", prefix: "  " },
  sep:   { color: "#1e293b", prefix: "" },
};

export function LogLine({ type = "info", text, mono = true }) {
  if (type === "sep") {
    return (
      <div style={{
        borderTop: "1px solid #1e293b",
        margin: "6px 0",
        opacity: 0.5,
      }} />
    );
  }
  const s = TYPE_STYLE[type] || TYPE_STYLE.info;
  return (
    <div style={{
      fontFamily: mono ? "var(--font-mono)" : "var(--font-ui)",
      fontSize: 12,
      lineHeight: 1.7,
      color: s.color,
      fontWeight: s.bold ? 700 : 400,
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
    }}>
      <span style={{ userSelect: "none", opacity: 0.7 }}>{s.prefix}</span>
      {text}
    </div>
  );
}

// ── Animated typing cursor ────────────────────────────────────────────────────
export function Cursor() {
  return (
    <span style={{
      display: "inline-block",
      width: 7,
      height: 13,
      background: "#00d4ff",
      opacity: 0.8,
      marginLeft: 2,
      verticalAlign: "middle",
      animation: "blink 1s step-end infinite",
    }} />
  );
}

// ── Terminal container ────────────────────────────────────────────────────────
export default function TerminalLog({ lines = [], running = false, maxHeight = 380, label }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [lines.length]);

  return (
    <div style={{
      background: "#020810",
      border: "1px solid #0f2035",
      borderRadius: 6,
      overflow: "hidden",
    }}>
      {/* Title bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 12px",
        background: "#070f1e",
        borderBottom: "1px solid #0f2035",
      }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
        <span style={{ fontSize: 10, color: "#475569", fontFamily: "var(--font-mono)", marginLeft: 6, letterSpacing: ".5px" }}>
          {label || "cryptkit — analysis"}
        </span>
        {running && (
          <span style={{ marginLeft: "auto", fontSize: 9, color: "#00d4ff", fontFamily: "var(--font-mono)", letterSpacing: "1px" }}>
            RUNNING
          </span>
        )}
      </div>

      {/* Log output */}
      <div style={{
        padding: "10px 14px",
        maxHeight,
        overflowY: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: "#1e293b #020810",
      }}>
        {lines.length === 0 ? (
          <LogLine type="dim" text="Waiting for input…" />
        ) : (
          lines.map((line, i) => (
            <LogLine key={i} type={line.type} text={line.text} mono={line.mono !== false} />
          ))
        )}
        {running && <Cursor />}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ── Performance badge ─────────────────────────────────────────────────────────
export function PerfBadge({ ms, label }) {
  const color = ms < 50 ? "#00e87a" : ms < 500 ? "#fbbf24" : "#f87171";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: 10,
      fontFamily: "var(--font-mono)",
      color,
      background: `${color}12`,
      border: `1px solid ${color}28`,
      borderRadius: 3,
      padding: "1px 6px",
    }}>
      ⏱ {ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`}
      {label && <span style={{ color: "#475569" }}> · {label}</span>}
    </span>
  );
}

// ── Confidence bar (reusable) ─────────────────────────────────────────────────
export function ConfidenceBar({ pct, color = "#00d4ff" }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
    }}>
      <div style={{
        flex: 1,
        height: 3,
        background: "#0f2035",
        borderRadius: 2,
        overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: 2,
          boxShadow: `0 0 6px ${color}66`,
          transition: "width .5s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color, minWidth: 28, textAlign: "right" }}>
        {pct}%
      </span>
    </div>
  );
}
