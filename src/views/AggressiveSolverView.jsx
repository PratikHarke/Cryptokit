/**
 * AggressiveSolverView.jsx — v9
 * Beam-search solver with score breakdown, intermediate results, and
 * human-readable explainability.
 *
 * Follows existing UI patterns exactly (same CSS vars, same card structure,
 * same PerfBadge usage as CryptanalysisView / ChainSolverView).
 * Zero changes to existing views.
 */

import { useState, useCallback } from 'react';
import { aggressiveSolve }       from '../crypto/aggressiveSolver.js';

// ── Demo presets ──────────────────────────────────────────────────────────────
const DEMOS = [
  { label: 'Hex+Caesar',   input: '6a617879207573706b20766a7220726e6e6d726e7979' },
  { label: 'B64→ROT13',    input: 'Wur frphef zrffntr vf: synterq' },
  { label: 'CTF flag',     input: 'ZmxhZ3toaWRkZW5fbWVzc2FnZX0=' },
  { label: 'Hex+XOR',      input: '1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b3736' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ value, color = 'var(--accent)' }) {
  return (
    <div style={{ background: 'var(--bg-hover)', borderRadius: 2, height: 3, marginTop: 6 }}>
      <div style={{
        width: `${Math.min(100, value)}%`, height: '100%',
        background: color, borderRadius: 2, transition: 'width .4s',
      }} />
    </div>
  );
}

function ScorePills({ bd }) {
  if (!bd) return null;
  const dims = [
    { label: 'Printable',  value: bd.printable,      max: 25, color: '#00d4ff' },
    { label: 'Words',      value: bd.englishWords,    max: 40, color: '#a78bfa' },
    { label: 'Chi-sq',     value: bd.chiImprove,      max: 20, color: '#ffd700' },
    { label: 'IC',         value: bd.icBonus,         max: 10, color: '#34d399' },
    { label: 'Entropy',    value: bd.entropyImprove,  max: 5,  color: '#fb923c' },
    { label: 'Flag',       value: bd.flagPattern,     max: 25, color: '#00e87a' },
  ];
  return (
    <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
      {dims.filter(d => (d.value ?? 0) > 0).map(d => (
        <span key={d.label} style={{
          padding: '2px 7px', borderRadius: 4, fontSize: 10,
          background: `${d.color}18`, color: d.color,
          border: `1px solid ${d.color}30`,
          fontFamily: 'var(--font-mono)',
        }}>
          {d.label}: {d.value}/{d.max}
        </span>
      ))}
    </div>
  );
}

function ResultCard({ r, rank, selected, onClick }) {
  const isFlag = (r.scoreBreakdown?.flagPattern ?? 0) >= 18;
  const borderColor = isFlag ? '#00e87a' : (selected ? 'var(--accent)' : 'var(--border)');

  return (
    <div
      onClick={onClick}
      style={{
        marginTop: 8, padding: 14, borderRadius: 8, cursor: 'pointer',
        background: selected ? 'var(--bg-hover)' : 'var(--bg-card)',
        border: `1px solid ${borderColor}`,
        transition: 'border-color .15s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)', flex: 1 }}>
          {isFlag && <span style={{ color: '#00e87a', marginRight: 6 }}>🏁</span>}
          #{rank} · {r.steps.length ? r.steps.join(' → ') : 'No transform'}
        </span>
        <span style={{ color: isFlag ? '#00e87a' : '#00d4ff', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
          {r.confidence}%
        </span>
      </div>

      <ScoreBar
        value={r.confidence}
        color={isFlag ? '#00e87a' : '#00d4ff'}
      />

      {/* Output preview */}
      <div style={{
        marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12,
        color: isFlag ? '#00e87a' : 'var(--text-2)',
        wordBreak: 'break-all', lineHeight: 1.5,
      }}>
        {r.output.slice(0, 180)}{r.output.length > 180 ? '…' : ''}
      </div>

      <ScorePills bd={r.scoreBreakdown} />
    </div>
  );
}

function IntermediateSteps({ steps }) {
  if (!steps?.length) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ color: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Step-by-step trace
      </div>
      {steps.map((s, i) => (
        <div key={i} style={{
          padding: '8px 10px', marginBottom: 5, borderRadius: 6,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              {i + 1}. {s.step}
            </span>
            <span style={{ color: '#00d4ff', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
              {s.confidence}%
              {s.flagScore > 0 && <span style={{ color: '#00e87a', marginLeft: 6 }}>flag+{s.flagScore}</span>}
            </span>
          </div>
          <div style={{
            marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--text-3)', wordBreak: 'break-all',
          }}>
            {(s.output ?? '').slice(0, 120)}{(s.output ?? '').length > 120 ? '…' : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailPanel({ r }) {
  return (
    <div style={{
      padding: 16, borderRadius: 8,
      background: 'var(--bg-hover)', border: '1px solid var(--border)',
    }}>
      {/* Full output */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
          Full output
        </div>
        <div style={{
          padding: 10, background: 'var(--bg-card)', borderRadius: 6,
          fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-1)',
          wordBreak: 'break-all', lineHeight: 1.6, border: '1px solid var(--border)',
        }}>
          {r.output}
        </div>
      </div>

      {/* Explainability */}
      {r.explanation && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Why this result
          </div>
          <div style={{ color: 'var(--text-2)', fontSize: 12, marginBottom: 4 }}>{r.explanation.whyExplored}</div>
          <div style={{ color: 'var(--text-2)', fontSize: 12 }}>{r.explanation.whyKept}</div>
        </div>
      )}

      {/* Intermediate steps */}
      <IntermediateSteps steps={r.intermediateResults} />

      {/* Metadata */}
      <div style={{
        marginTop: 12, padding: '6px 10px', borderRadius: 5,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)',
        display: 'flex', gap: 12, flexWrap: 'wrap',
      }}>
        <span>Depth: {r.metadata.depth}</span>
        <span>Rank: #{r.metadata.branchRank}</span>
        <span>Pruned: {r.metadata.prunedAlternatives}</span>
        <span>Cache: {r.metadata.stateCache.hits}h / {r.metadata.stateCache.misses}m</span>
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function AggressiveSolverView({ addHistory }) {
  const [input,    setInput]    = useState('');
  const [mode,     setMode]     = useState('standard');
  const [results,  setResults]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [running,  setRunning]  = useState(false);
  const [elapsed,  setElapsed]  = useState(null);
  const [hasRun,   setHasRun]   = useState(false);

  const run = useCallback(() => {
    const t = input.trim();
    if (!t || running) return;
    setRunning(true);
    setResults([]);
    setSelected(null);
    setElapsed(null);

    // Yield to paint so button text updates to "Solving…"
    setTimeout(() => {
      try {
        const t0 = performance.now();
        const res = aggressiveSolve(t, mode);
        setElapsed(Math.round(performance.now() - t0));
        setResults(res);
        setHasRun(true);
        if (res.length > 0) {
          setSelected(0);
          addHistory?.(
            'Aggressive Solver',
            t.slice(0, 80),
            res[0].scoreBreakdown?.flagPattern >= 18
              ? `🏁 FLAG: ${res[0].output.slice(0, 60)}`
              : `Best (${res[0].confidence}%): ${res[0].steps.join(' → ')}`,
          );
        }
      } catch (e) {
        console.error('[AggressiveSolver]', e);
      } finally {
        setRunning(false);
      }
    }, 10);
  }, [input, mode, running, addHistory]);

  const loadDemo = (d) => {
    setInput(d.input);
    setResults([]);
    setSelected(null);
    setHasRun(false);
    setElapsed(null);
  };

  const isAggressive = mode === 'aggressive';

  return (
    <div style={{ padding: 24, maxWidth: 940, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
          Quick Access
        </div>
        <h1 style={{ margin: 0, fontSize: 20, color: 'var(--text-1)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Aggressive Solver
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 13 }}>
          Beam search with explainability — explores decode chains with per-step score breakdown and flag detection.
        </p>
      </div>

      {/* Demo chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {DEMOS.map(d => (
          <button
            key={d.label}
            onClick={() => loadDemo(d)}
            style={{
              padding: '3px 10px', borderRadius: 4, fontSize: 11,
              background: 'var(--bg-hover)', color: 'var(--text-2)',
              border: '1px solid var(--border)', cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Paste ciphertext, encoded string, or CTF challenge here…"
        style={{
          width: '100%', height: 110, boxSizing: 'border-box',
          fontFamily: 'var(--font-mono)', fontSize: 12,
          background: 'var(--bg-card)', color: 'var(--text-1)',
          border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px',
          resize: 'vertical', outline: 'none',
        }}
        onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run(); }}
      />

      {/* Controls row */}
      <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Mode toggle */}
        <button
          onClick={() => setMode(m => m === 'standard' ? 'aggressive' : 'standard')}
          style={{
            padding: '7px 14px', borderRadius: 6, fontSize: 12,
            background: isAggressive ? '#7c3aed22' : 'var(--bg-hover)',
            color: isAggressive ? '#a78bfa' : 'var(--text-2)',
            border: `1px solid ${isAggressive ? '#7c3aed' : 'var(--border)'}`,
            cursor: 'pointer', fontFamily: 'var(--font-mono)',
          }}
        >
          {isAggressive ? '🔥 Aggressive' : '⚡ Standard'} mode
        </button>

        {/* Run button */}
        <button
          onClick={run}
          disabled={running || !input.trim()}
          style={{
            padding: '7px 22px', borderRadius: 6, fontSize: 13, fontWeight: 700,
            background: (running || !input.trim()) ? 'var(--bg-hover)' : 'var(--accent)',
            color: (running || !input.trim()) ? 'var(--text-3)' : '#000',
            border: '1px solid var(--border)', cursor: running ? 'wait' : 'pointer',
            letterSpacing: '0.04em',
          }}
        >
          {running ? 'Solving…' : 'Solve ↗'}
        </button>

        {/* Perf badge */}
        {elapsed !== null && !running && (
          <span style={{
            fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
            padding: '3px 8px', background: 'var(--bg-hover)',
            border: '1px solid var(--border)', borderRadius: 4,
          }}>
            ⏱ {elapsed}ms · {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* Mode hint */}
        {isAggressive && (
          <span style={{ fontSize: 11, color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>
            depth 4 · beam 12 · floor 5
          </span>
        )}
      </div>

      {/* Results */}
      {hasRun || results.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: results.length > 0 && selected !== null ? '1fr 1fr' : '1fr', gap: 16, marginTop: 16 }}>
          {/* Result list */}
          <div>
            {results.length === 0 && !running && (
              <div className="card">
                <div className="empty">
                  No results found. Try switching to 🔥 Aggressive mode, or use the XOR Cracker / Substitution Solver for non-standard encodings.
                </div>
              </div>
            )}
            {results.map((r, i) => (
              <ResultCard
                key={i}
                r={r}
                rank={i + 1}
                selected={selected === i}
                onClick={() => setSelected(selected === i ? null : i)}
              />
            ))}
          </div>

          {/* Detail panel */}
          {selected !== null && results[selected] && (
            <div>
              <DetailPanel r={results[selected]} />
            </div>
          )}
        </div>
      ) : (
        <div style={{
          marginTop: 24, padding: 20, borderRadius: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          color: 'var(--text-3)', fontSize: 13, textAlign: 'center',
        }}>
          {input.trim()
            ? 'Press Solve ↗ or Ctrl+Enter to run the beam-search decoder.'
            : 'Paste encoded text or pick a demo above, then click Solve.'}
        </div>
      )}

      {/* How it works */}
      {results.length === 0 && !running && (
        <div style={{ marginTop: 20, color: 'var(--text-3)', fontSize: 12, lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text-2)' }}>How it works:</strong>{' '}
          The solver runs beam search over transform chains (Base64, Hex, Caesar, XOR, Vigenère, ROT-13…).
          At each depth it keeps the top-scoring branches, scores every step independently, and surfaces
          a breakdown of what makes each result plausible.{' '}
          <strong>Aggressive mode</strong> doubles the search budget and lowers the pruning floor to 5,
          catching low-confidence intermediate steps that standard mode skips.
        </div>
      )}
    </div>
  );
}
