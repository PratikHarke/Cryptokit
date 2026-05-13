import { useState } from "react";
import { CopyBtn } from "../components/Output.jsx";

// ─── JWT Parsing ──────────────────────────────────────────────────────────────

function base64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + (4 - str.length % 4) % 4, "=");
  try { return JSON.parse(atob(padded)); } catch { return null; }
}

function base64urlDecodeRaw(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + (4 - str.length % 4) % 4, "=");
  try { return atob(padded); } catch { return null; }
}

function parseJWT(token) {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return { error: `JWT must have 3 parts separated by dots. Got ${parts.length} part(s).` };
  const header  = base64urlDecode(parts[0]);
  const payload = base64urlDecode(parts[1]);
  const sigRaw  = base64urlDecodeRaw(parts[2]);
  if (!header)  return { error: "Failed to decode header. Is this a valid JWT?" };
  if (!payload) return { error: "Failed to decode payload. Is this a valid JWT?" };
  const sigHex = sigRaw ? Array.from(sigRaw).map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join(" ") : "(empty)";
  return { header, payload, sigHex, parts };
}

function analyzeVulnerabilities(header, payload) {
  const issues = [];
  const alg = header.alg?.toLowerCase() ?? "";

  if (alg === "none" || alg === "") {
    issues.push({ sev: "critical", msg: 'Algorithm is "none" — no signature verification. Server may accept arbitrary payloads.' });
  }
  if (alg.startsWith("hs")) {
    issues.push({ sev: "info", msg: `HS256/HS384/HS512: HMAC with shared secret. Vulnerable to secret brute-forcing if secret is weak.` });
    issues.push({ sev: "warn", msg: "RS256→HS256 confusion: if server accepts both RS and HS, send RS public key as HS secret." });
  }
  if (alg.startsWith("rs") || alg.startsWith("ps")) {
    issues.push({ sev: "info", msg: "RSA algorithm. Check for key confusion attacks (RS256 → HS256) if server supports both." });
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp !== undefined) {
    if (payload.exp < now) {
      issues.push({ sev: "warn", msg: `Token EXPIRED — exp was ${new Date(payload.exp * 1000).toUTCString()}` });
    } else {
      const mins = Math.round((payload.exp - now) / 60);
      issues.push({ sev: "ok", msg: `Token valid for ~${mins} more minute${mins !== 1 ? "s" : ""}.` });
    }
  } else {
    issues.push({ sev: "warn", msg: "No expiry (exp) claim — token never expires." });
  }

  if (payload.nbf !== undefined && payload.nbf > now) {
    issues.push({ sev: "warn", msg: `Token not yet valid — nbf is ${new Date(payload.nbf * 1000).toUTCString()}` });
  }

  if (!payload.iss) issues.push({ sev: "info", msg: "No issuer (iss) claim." });
  if (!payload.aud) issues.push({ sev: "info", msg: "No audience (aud) claim — any service could accept this token." });

  return issues;
}

function generateAlgNone(parts) {
  const header = base64urlDecode(parts[0]);
  if (!header) return null;
  const newHeader = { ...header, alg: "none" };
  const encoded = btoa(JSON.stringify(newHeader)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encoded}.${parts[1]}.`;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

const SEV_STYLE = {
  critical: { bg: "#7f1d1d33", color: "var(--red)", icon: "🚨" },
  warn:     { bg: "#78350f33", color: "var(--yellow)", icon: "⚠️" },
  info:     { bg: "var(--bg-hover)",   color: "#94a3b8", icon: "ℹ️" },
  ok:       { bg: "#14532d33", color: "var(--green)", icon: "✓" },
};

function ClaimRow({ k, v }) {
  const isTimestamp = ["iat","exp","nbf"].includes(k) && typeof v === "number";
  const dateStr = isTimestamp ? new Date(v * 1000).toUTCString() : null;
  return (
    <div style={{ display: "flex", padding: "6px 0", borderBottom: "1px solid #0f172a", gap: 12 }}>
      <span style={{ fontWeight: 600, color: "#93c5fd", minWidth: 80, fontSize: 12 }}>{k}</span>
      <div style={{ flex: 1 }}>
        <span style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>
          {JSON.stringify(v)}
        </span>
        {dateStr && (
          <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>{dateStr}</div>
        )}
      </div>
    </div>
  );
}

function JSONBlock({ obj, title, color }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color, letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ background: "#070b16", border: `1px solid ${color}33`, borderRadius: 6, padding: "10px 12px" }}>
        {Object.entries(obj).map(([k, v]) => <ClaimRow key={k} k={k} v={v} />)}
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function JWTView({ addHistory }) {
  const [token, setToken] = useState("");
  const [result, setResult] = useState(null);
  const [algNone, setAlgNone] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  const run = () => {
    const r = parseJWT(token);
    setResult(r);
    setAlgNone("");
    if (!r.error) {
      addHistory("JWT Inspect", token.slice(0, 20) + "…", `alg=${r.header.alg}, sub=${r.payload.sub ?? "—"}`);
    }
  };

  const makeAlgNone = () => {
    if (!result?.parts) return;
    const t = generateAlgNone(result.parts);
    setAlgNone(t);
    addHistory("JWT alg:none", token.slice(0, 20) + "…", t?.slice(0, 60));
  };

  const issues = result && !result.error ? analyzeVulnerabilities(result.header, result.payload) : [];
  const critCount = issues.filter(i => i.sev === "critical").length;
  const warnCount = issues.filter(i => i.sev === "warn").length;

  return (
    <div>
      <div className="section-header">
        <h3>JWT Inspector</h3>
        <p>Decode header and payload, analyze claims, detect vulnerabilities, generate alg:none variant.</p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label>JWT token</label>
        <textarea
          value={token}
          onChange={e => { setToken(e.target.value); setResult(null); setAlgNone(""); }}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
          rows={4}
          style={{ fontFamily: "monospace", fontSize: 11 }}
        />
        <button className="btn btn-primary" style={{ marginTop: 10, width: "100%" }} onClick={run}>
          Inspect ↗
        </button>
      </div>

      {result?.error && (
        <div className="card">
          <div style={{ color: "#ef4444", fontSize: 13 }}>{result.error}</div>
        </div>
      )}

      {result && !result.error && (
        <>
          {/* Vulnerability summary */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className="card-title" style={{ margin: 0 }}>Security Analysis</div>
              <div style={{ display: "flex", gap: 6 }}>
                {critCount > 0 && <span className="tag tag-high">🚨 {critCount} critical</span>}
                {warnCount > 0 && <span className="tag tag-med">⚠️ {warnCount} warning{warnCount !== 1 ? "s" : ""}</span>}
                {critCount === 0 && warnCount === 0 && <span className="tag tag-low">No critical issues</span>}
              </div>
            </div>
            {issues.map((iss, i) => {
              const s = SEV_STYLE[iss.sev];
              return (
                <div key={i} style={{
                  display: "flex", gap: 8, alignItems: "flex-start",
                  padding: "7px 10px", borderRadius: 6, background: s.bg,
                  marginBottom: 6, fontSize: 12, color: s.color,
                }}>
                  <span>{s.icon}</span>
                  <span>{iss.msg}</span>
                </div>
              );
            })}
          </div>

          {/* Decoded sections */}
          <div className="card" style={{ marginBottom: 12 }}>
            <JSONBlock obj={result.header}  title="Header"  color="#93c5fd" />
            <JSONBlock obj={result.payload} title="Payload" color="var(--green)" />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--red)", letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 6 }}>
                Signature (hex)
              </div>
              <div style={{
                background: "#070b16", border: "1px solid #f8717133", borderRadius: 6,
                padding: "8px 12px", fontFamily: "monospace", fontSize: 11, color: "var(--red)",
                wordBreak: "break-all",
              }}>
                {result.sigHex}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-title">Attack Tools</div>

            <div style={{ display: "flex", gap: 8, marginBottom: algNone ? 12 : 0 }}>
              <button className="btn btn-primary" onClick={makeAlgNone} style={{ flex: 1 }}>
                Generate alg:none variant ↗
              </button>
              <button className="btn btn-ghost" onClick={() => setShowRaw(v => !v)}>
                {showRaw ? "Hide" : "Show"} raw parts
              </button>
            </div>

            {algNone && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "var(--red)", fontWeight: 600, marginBottom: 6 }}>
                  alg:none token (no signature — send this if server skips verification)
                </div>
                <div style={{
                  background: "#7f1d1d22", border: "1px solid #7f1d1d", borderRadius: 6,
                  padding: "8px 12px", fontFamily: "monospace", fontSize: 11, color: "var(--red)",
                  wordBreak: "break-all", position: "relative",
                }}>
                  <CopyBtn text={algNone} />
                  {algNone}
                </div>
              </div>
            )}

            {showRaw && (
              <div style={{ marginTop: 12 }}>
                {[["Header (b64url)", result.parts[0], "#93c5fd"], ["Payload (b64url)", result.parts[1], "var(--green)"], ["Signature (b64url)", result.parts[2], "var(--red)"]].map(([label, val, color]) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                    <div style={{
                      background: "#070b16", border: `1px solid ${color}33`, borderRadius: 6,
                      padding: "6px 10px", fontFamily: "monospace", fontSize: 11, color,
                      wordBreak: "break-all", position: "relative",
                    }}>
                      <CopyBtn text={val} />
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
