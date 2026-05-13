import { useState, useEffect, useRef } from "react";

// ── Global copy toast ─────────────────────────────────────────────────────────
// A lightweight singleton toast: renders in-place since we can't use portals here.
// SmartSolverView and PipelineView each can show it via the CopyBtn.

export function CopyBtn({ text, label }) {
  const [state, setState] = useState("idle"); // idle | copied

  const copy = (e) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setState("copied");
      setTimeout(() => setState("idle"), 1500);
    }).catch(() => {});
  };

  return (
    <button
      className={`copy-btn${state === "copied" ? " copied" : ""}`}
      onClick={copy}
      data-tooltip={state === "copied" ? "Copied!" : "Copy to clipboard"}
      aria-label={state === "copied" ? "Copied!" : "Copy to clipboard"}
    >
      {state === "copied" ? "✓ Copied!" : (label ?? "copy")}
    </button>
  );
}

// Inline toast that shows near the copy action (used standalone)
export function CopyToast({ visible }) {
  if (!visible) return null;
  return (
    <div className="copy-toast">
      <span>✓</span> Copied!
    </div>
  );
}

export default function Output({ value, mono }) {
  return (
    <div style={{ position: "relative" }}>
      {value && <CopyBtn text={value} />}
      <div className={`output${mono ? " mono" : ""}`}>
        {value || <span style={{ color: "#334155" }}>Output will appear here…</span>}
      </div>
    </div>
  );
}
