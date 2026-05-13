import { useState, useCallback, useRef } from "react";
import { exploreChains, buildLogLines, detectStep, applyDecoder } from "../crypto/chainSolver.js";
import TerminalLog, { PerfBadge, ConfidenceBar } from "../components/TerminalLog.jsx";
import { CopyBtn } from "../components/Output.jsx";

// ── Category colors ───────────────────────────────────────────────────────────
const CAT_COLOR = {
  flag:     "#00e87a",
  high:     "#00d4ff",
  mid:      "#a78bfa",
  low:      "#64748b",
};

function chainColor(r) {
  if (r.hasFlag) return CAT_COLOR.flag;
  if (r.score > 60) return CAT_COLOR.high;
  if (r.score > 30) return CAT_COLOR.mid;
  return CAT_COLOR.low;
}

// ── Step badge ────────────────────────────────────────────────────────────────
function ChainBadge({ steps }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
      {steps.map((step, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center" }}>
          <span style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            padding: "2px 7px",
            borderRadius: 3,
            background: "#0f2035",
            border: "1px solid #1e3a5f",
            color: "#94a3b8",
          }}>
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <span style={{ fontSize: 10, color: "#334155", margin: "0 2px" }}>→</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────
function ChainResultCard({ r, input, selected, onClick }) {
  const color = chainColor(r);
  const CLIP  = 160;
  const [expanded, setExpanded] = useState(false);
  const isLong = r.output.length > CLIP;

  return (
    <div
      onClick={onClick}
      style={{
        background: r.hasFlag ? "#001a0a" : selected ? "#050f1a" : "#030b15",
        border: `1px solid ${selected ? color : r.hasFlag ? "#00e87a30" : "#0f2035"}`,
        borderRadius: 6,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all .15s",
        boxShadow: r.hasFlag ? "0 0 20px #00e87a08" : selected ? `0 0 12px ${color}10` : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {r.hasFlag && <span>🏁</span>}
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-1)", fontFamily: "var(--font-mono)" }}>
            {r.chain.length}-layer chain
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color }}>
            {r.score}pts
          </span>
          <CopyBtn text={r.output} />
        </div>
      </div>

      <ChainBadge steps={r.chain} />

      <div style={{
        marginTop: 8,
        fontSize: 12,
        fontFamily: "var(--font-mono)",
        color: r.hasFlag ? "#00e87a" : "var(--text-1)",
        wordBreak: "break-all",
        lineHeight: 1.5,
      }}>
        {expanded || !isLong ? r.output : r.output.slice(0, CLIP) + "…"}
        {isLong && (
          <span
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{ color: "#00d4ff", cursor: "pointer", fontSize: 10, marginLeft: 6 }}
          >
            {expanded ? "less" : "more"}
          </span>
        )}
      </div>

      <ConfidenceBar pct={Math.min(r.printable, 99)} color={color} />
      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
        <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "#334155" }}>
          printable {r.printable}%
        </span>
        <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "#334155" }}>
          english score {r.english}
        </span>
      </div>
    </div>
  );
}

// ── Manual step builder ───────────────────────────────────────────────────────
function ManualChain({ input }) {
  const [steps, setSteps] = useState([{ text: input, op: null }]);
  const [logs, setLogs] = useState([{ type: "info", text: "Add steps below to decode manually." }]);

  const addStep = (id, label) => {
    const current = steps[steps.length - 1].text;
    const result = applyDecoder(id, current);
    if (!result) {
      setLogs(l => [...l, { type: "error", text: `${label}: failed — input not compatible` }]);
      return;
    }
    setSteps(s => [...s, { text: result, op: label }]);
    setLogs(l => [...l,
      { type: "info", text: `Step ${steps.length}: ${label}` },
      { type: "ok", text: result.slice(0, 120) + (result.length > 120 ? "…" : "") },
    ]);
  };

  const reset = () => {
    setSteps([{ text: input, op: null }]);
    setLogs([{ type: "info", text: "Chain reset." }]);
  };

  const current = steps[steps.length - 1].text;
  const suggestions = detectStep(current);

  const STEP_OPTIONS = [
    { id: "base64",   label: "Base64" },
    { id: "hex",      label: "Hex" },
    { id: "binary",   label: "Binary" },
    { id: "rot13",    label: "ROT-13" },
    { id: "atbash",   label: "Atbash" },
    { id: "rot47",    label: "ROT-47" },
    { id: "reverse",  label: "Reverse" },
    { id: "urldecode",label: "URL decode" },
    { id: "base32",   label: "Base32" },
    { id: "morse",    label: "Morse" },
    { id: "xor_brute",label: "XOR brute" },
    { id: "caesar",   label: "Caesar (best)" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#64748b", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
          ADD STEP — {steps.length - 1} applied
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
          {STEP_OPTIONS.map(opt => {
            const isSuggested = suggestions.some(s => s.id === opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => addStep(opt.id, opt.label)}
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  padding: "3px 9px",
                  borderRadius: 4,
                  border: `1px solid ${isSuggested ? "#00d4ff60" : "#1e293b"}`,
                  background: isSuggested ? "#00d4ff08" : "#030b15",
                  color: isSuggested ? "#00d4ff" : "#64748b",
                  cursor: "pointer",
                  transition: ".1s",
                }}
              >
                {opt.label}
                {isSuggested && " ✦"}
              </button>
            );
          })}
        </div>
        {steps.length > 1 && (
          <button className="btn btn-ghost btn-sm" onClick={reset} style={{ fontSize: 10 }}>
            ↺ Reset chain
          </button>
        )}
      </div>

      <TerminalLog lines={logs} label="manual chain" maxHeight={200} />

      {steps.length > 1 && (
        <div className="card" style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div className="card-title" style={{ marginBottom: 0, fontSize: 11 }}>Current output</div>
            <CopyBtn text={current} />
          </div>
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "#e2e8f0",
            wordBreak: "break-all",
            lineHeight: 1.6,
          }}>
            {current}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

const EXAMPLES = [
  { label: "ROT13",    text: "uryyb_jbeyq" },
  { label: "B64×2",   text: "Vm0wd2QyUXlVWGxWV0d4V1YwZDRWMVl3WkRSV01WbDNXa1JTVjAxV2JETlhhMUpUVmpBeFYy" },
  { label: "Hex+XOR", text: "0e0b041a03" },
  { label: "Chain",   text: "ZmxhZ3t0aGlzX2lzX2Jhc2U2NH0=" },
  { label: "Layered", text: "SGVsbG8gV29ybGQ=" },
];

export default function ChainSolverView({ addHistory }) {
  const [input, setInput]     = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [logs, setLogs]       = useState([]);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(null);
  const [hasRun,  setHasRun]  = useState(false);
  const [tab, setTab]         = useState("auto");
  const startRef = useRef(null);

  const run = useCallback(async (text) => {
    const t = (text ?? input).trim();
    if (!t) return;

    setRunning(true);
    setResults([]);
    setSelected(null);
    setElapsed(null);
    startRef.current = performance.now();

    setLogs([
      { type: "cmd", text: `chain-solve "${t.slice(0, 60)}${t.length > 60 ? "…" : ""}"` },
      { type: "sep" },
      { type: "info", text: `Input length: ${t.length} chars` },
      { type: "info", text: "Exploring decode chains (depth ≤ 4)…" },
    ]);

    // yield to paint
    await new Promise(r => setTimeout(r, 10));

    try {
      const chains = exploreChains(t, 4, 14);
      const ms = Math.round(performance.now() - startRef.current);
      setElapsed(ms);

      if (chains.length === 0) {
        setLogs(l => [...l,
          { type: "sep" },
          { type: "warn", text: "No decode chain found with readable output." },
          { type: "info", text: "Try: XOR Cracker · Substitution Solver · Pipeline" },
        ]);
      } else {
        const flagChain = chains.find(c => c.hasFlag);
        setLogs(l => [...l,
          { type: "sep" },
          { type: "ok", text: `Found ${chains.length} candidate chain${chains.length !== 1 ? "s" : ""} in ${ms}ms` },
          ...(flagChain ? [{ type: "flag", text: `FLAG FOUND via: ${flagChain.chain.map(s => s.label).join(" → ")}` }] : []),
          { type: "sep" },
          { type: "info", text: "Select a result to see step-by-step trace →" },
        ]);
      }

      setResults(chains);
      setHasRun(true);
      if (chains.length > 0) {
        setSelected(0);
        addHistory?.(
          "Chain Solver",
          t.slice(0, 80),
          chains[0].hasFlag
            ? `🏁 FLAG: ${chains[0].output.slice(0, 60)}`
            : `Best: ${chains[0].chain.map(s => s.label).join(" → ")}`,
        );
      }
    } catch (e) {
      setLogs(l => [...l, { type: "error", text: `Error: ${e.message}` }]);
    } finally {
      setRunning(false);
    }
  }, [input, addHistory]);

  const selectedResult = selected !== null ? results[selected] : null;
  const terminalLines = selectedResult
    ? buildLogLines(selectedResult, input.trim())
    : logs;

  return (
    <div>
      <div className="section-header">
        <h3>Chain Solver</h3>
        <p>
          Automatically explores multi-layer decode chains up to 4 levels deep.
          Ranks results by English plausibility and flag detection.
        </p>
      </div>

      {/* Input */}
      <div className="card" style={{ marginBottom: 12 }}>
        <label>
          Ciphertext / encoded input
          <span style={{ color: "#475569", fontSize: 10, marginLeft: 8 }}>paste anything</span>
        </label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={3}
          placeholder="Paste encoded text, a flag, or any suspicious string…"
          style={{ fontFamily: "var(--font-mono)" }}
          onKeyDown={e => e.key === "Enter" && e.ctrlKey && run()}
        />

        {/* Examples */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {EXAMPLES.map(ex => (
            <button
              key={ex.label}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 10 }}
              onClick={() => { setInput(ex.text); run(ex.text); }}
            >
              {ex.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-primary"
            onClick={() => run()}
            disabled={running || !input.trim()}
            style={{ fontSize: 12 }}
          >
            {running ? "Solving…" : "Solve chains ↗"}
          </button>
        </div>

        {elapsed !== null && (
          <div style={{ marginTop: 6 }}>
            <PerfBadge ms={elapsed} label={`${results.length} chains found`} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs-wrap">
        {[["auto", "Auto results"], ["manual", "Manual chain builder"]].map(([id, label]) => (
          <button key={id} className={`tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "auto" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Results list */}
          <div>
            {results.length === 0 && !running && (
              <div className="card">
                <div className="empty">
                  {!hasRun
                    ? (input.trim() ? "Run the solver to see results." : "Paste input above and click Solve.")
                    : "No decode chains found with readable output. Try the XOR Cracker, Substitution Solver, or Pipeline for more options."
                  }
                </div>
              </div>
            )}
            {results.map((r, i) => (
              <ChainResultCard
                key={i}
                r={r}
                input={input}
                selected={selected === i}
                onClick={() => setSelected(i)}
              />
            ))}
          </div>

          {/* Terminal trace */}
          <div>
            <TerminalLog
              lines={terminalLines}
              running={running}
              label="chain-solver — trace"
              maxHeight={460}
            />
          </div>
        </div>
      )}

      {tab === "manual" && input.trim() && (
        <ManualChain key={input} input={input.trim()} />
      )}
      {tab === "manual" && !input.trim() && (
        <div className="card">
          <div className="empty">Paste input in the box above first.</div>
        </div>
      )}
    </div>
  );
}
