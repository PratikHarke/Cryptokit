import { useState } from "react";
import { auditPassword } from "../crypto/hash.js";

export default function PassAuditView({ addHistory }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [result, setResult] = useState(null);

  const run = () => {
    const r = auditPassword(pw);
    setResult(r);
    addHistory("Password Audit", "[sensitive]", r.strength);
  };

  return (
    <div>
      <div className="section-header">
        <h3>Password Strength Audit</h3>
        <p>Shannon entropy analysis, pattern detection, and actionable recommendations.</p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label>Password</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type={show ? "text" : "password"}
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Enter password to audit…"
            style={{ flex: 1 }}
          />
          <button className="btn btn-ghost btn-sm" onClick={() => setShow(!show)}>
            {show ? "Hide" : "Show"}
          </button>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 10, width: "100%" }} onClick={run}>
          Audit ↗
        </button>
      </div>

      {result && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: result.strengthColor }}>{result.strength}</span>
            <span className="tag" style={{ background: result.strengthColor + "22", color: result.strengthColor }}>
              {result.entropy} bits entropy
            </span>
          </div>

          <div className="strength-bar">
            <div className="strength-fill" style={{ width: `${result.pct}%`, background: result.strengthColor }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, marginBottom: 12 }}>
            {[
              ["Length",        pw.length + " chars"],
              ["Charset size",  result.pool + " symbols"],
              ["Entropy",       result.entropy + " bits"],
              ["Est. crack time", result.crackTime],
            ].map(([k, v]) => (
              <div key={k} style={{ background: "#070b16", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{v}</div>
              </div>
            ))}
          </div>

          {result.issues.length > 0 ? (
            <div>
              <div className="card-title" style={{ marginBottom: 6 }}>Issues found</div>
              {result.issues.map((issue, i) => (
                <div key={i} className="issue">{issue}</div>
              ))}
            </div>
          ) : (
            <div className="ok">No common weaknesses detected. Good password.</div>
          )}
        </div>
      )}
    </div>
  );
}
