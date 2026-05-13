/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CryptKit v7 — CryptanalysisView.jsx                        ║
 * ║  Smart Cryptanalysis Engine UI                               ║
 * ║                                                              ║
 * ║  New view — drop into src/views/ and add one registry line. ║
 * ║  Reuses existing UI patterns (no design overhaul).           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useRef, useContext } from 'react';
import { analyse }                  from '../crypto/pipelineEngine.js';
import { detect, profileInput }     from '../crypto/detector.js';
import { CopyBtn }                  from '../components/Output.jsx';
import { BeginnerContext }          from '../App.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Constants / style tokens (matches existing --var palette)
// ─────────────────────────────────────────────────────────────────────────────

const GRADE_COLOR = {
  '🏁 FLAG': '#00e87a',
  'A':        '#00d4ff',
  'B':        '#a78bfa',
  'C':        '#ffd700',
  'D':        '#ff7300',
  'F':        '#64748b',
};

const CAT_COLOR = {
  encoding:  '#00d4ff',
  classical: '#a78bfa',
  xor:       '#ffd700',
  hash:      '#fb923c',
  other:     '#64748b',
};

const EXAMPLES = [
  { label: 'Base64',       input: 'ZmxhZ3tiYXNlNjRfaXNfZWFzeX0=' },
  { label: 'B64→B64',     input: 'Wm14aFp6dGlZWE5sTmpSZlpYbHpYMkZoYm5rOVBRPT0=' },
  { label: 'Hex+Caesar',  input: '6a617879207573706b20766a7220726e6e6d726e7979' },
  { label: 'ROT-13',      input: 'synt{lbh_sbhaq_vg}' },
  { label: 'Morse',       input: '..-. .-.. .- --.  ... --- .-.. ...- . -..' },
  { label: 'Atbash',      input: 'uozt{zgyzhsb_xrksvi}' },
  { label: 'Caesar(13)',  input: 'Gur frperg zrffntr vf: synterq' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ConfBar({ value, color, height = 3 }) {
  return (
    <div style={{ background: 'var(--bg-hover)', borderRadius: 2, height, overflow: 'hidden' }}>
      <div style={{
        width:      `${Math.max(0, Math.min(100, value))}%`,
        height:     '100%',
        background:  color,
        transition: 'width .4s ease',
        boxShadow:  `0 0 6px ${color}55`,
      }} />
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <span style={{
      display:    'inline-flex', alignItems: 'center', gap: 4,
      padding:    '2px 8px', borderRadius: 12,
      background: `${color}14`, border: `1px solid ${color}30`,
      fontSize: 10, fontFamily: 'var(--font-mono)',
      color: 'var(--text-2)',
    }}>
      <span style={{ color }}>{label}</span>
      <span style={{ color: 'var(--text-1)', fontWeight: 700 }}>{value}</span>
    </span>
  );
}

function DetectionBadge({ det }) {
  const color = CAT_COLOR[det.category] || CAT_COLOR.other;
  return (
    <div style={{
      background: `${color}0d`, border: `1px solid ${color}28`,
      borderRadius: 6, padding: '8px 12px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: 8,
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
          {det.label}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
          {det.hint}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
          {det.confidence}%
        </div>
        <ConfBar value={det.confidence} color={color} height={2} />
      </div>
    </div>
  );
}

function ChainBadge({ steps }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', rowGap: 4 }}>
      {steps.map((step, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-mono)',
            padding:  '2px 7px', borderRadius: 3,
            background: '#0f2035', border: '1px solid #1e3a5f',
            color: 'var(--text-2)',
          }}>
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <span style={{ fontSize: 10, color: '#334155', margin: '0 2px' }}>→</span>
          )}
        </span>
      ))}
    </div>
  );
}

function ScoreBreakdown({ s }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
      gap: 6, padding: '8px 0',
    }}>
      {[
        { label: 'Word score',     val: s.wordScore,           max: 100, color: '#00e87a' },
        { label: 'Printable',      val: Math.round(s.printableRatio * 100), max: 100, color: '#00d4ff' },
        { label: 'Chi-sq score',   val: s.chiScore,            max: 100, color: '#a78bfa' },
        { label: 'IC score',       val: s.icScore,             max: 100, color: '#ffd700' },
        { label: 'Entropy Δ',      val: s.entropyDelta > 0 ? `+${s.entropyDelta.toFixed(2)}` : s.entropyDelta.toFixed(2), max: null, color: '#fb923c', raw: true },
      ].map(({ label, val, max, color, raw }) => (
        <div key={label} style={{
          background: '#061222', border: '1px solid #162840', borderRadius: 4,
          padding: '6px 8px',
        }}>
          <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
            {raw ? val : `${val}`}
          </div>
          {!raw && max && <ConfBar value={val} color={color} height={2} />}
        </div>
      ))}
    </div>
  );
}

function ResultCard({ result, index }) {
  const [expanded,  setExpanded]  = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const gradeColor = GRADE_COLOR[result.score.grade] || '#64748b';
  const CLIP = 300;
  const isLong = result.finalOutput.length > CLIP;

  return (
    <div style={{
      background:  result.hasFlag ? '#001a0a' : '#030b15',
      border:      `1px solid ${result.hasFlag ? '#00e87a40' : '#0f2035'}`,
      borderRadius: 6,
      padding:     '12px 14px',
      transition:  'border-color .2s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {result.hasFlag && <span style={{ fontSize: 14 }}>🏁</span>}
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>
            #{index + 1} · {result.chainLabels.length === 0 ? 'Direct' : `${result.chainLabels.length}-layer chain`}
          </span>
          <span style={{
            fontSize: 10, padding: '1px 7px', borderRadius: 10,
            background: `${gradeColor}18`, border: `1px solid ${gradeColor}40`,
            color: gradeColor, fontFamily: 'var(--font-mono)', fontWeight: 700,
          }}>
            {result.score.grade}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: gradeColor, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {result.confidence}%
          </span>
          <CopyBtn text={result.finalOutput} />
        </div>
      </div>

      {/* Confidence bar */}
      <ConfBar value={result.confidence} color={gradeColor} height={3} />

      {/* Chain steps */}
      {result.chainLabels.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <ChainBadge steps={result.steps} />
        </div>
      )}

      {/* Output text */}
      <div style={{
        marginTop: 10, padding: '8px 10px',
        background: 'var(--bg-output)', borderRadius: 4,
        fontFamily: 'var(--font-mono)', fontSize: 12,
        color: result.hasFlag ? '#00e87a' : 'var(--text-1)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        maxHeight: expanded ? 'none' : '80px', overflow: 'hidden',
      }}>
        {isLong && !expanded ? result.finalOutput.slice(0, CLIP) + '…' : result.finalOutput}
      </div>

      {/* Expand / Breakdown toggles */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {isLong && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--accent)', padding: 0 }}
          >
            {expanded ? '▲ Collapse' : `▼ Show all (${result.finalOutput.length} chars)`}
          </button>
        )}
        <button
          onClick={() => setShowSteps(s => !s)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-3)', padding: 0 }}
        >
          {showSteps ? '▲ Hide details' : '▼ Score breakdown'}
        </button>
      </div>

      {/* Score breakdown panel */}
      {showSteps && (
        <div style={{ borderTop: '1px solid #0f2035', marginTop: 10, paddingTop: 8 }}>
          <ScoreBreakdown s={result.score} />
          {result.steps.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>
                INTERMEDIATE STATES
              </div>
              {result.steps.map((step, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: '5px 0', borderBottom: '1px solid #0a1828',
                }}>
                  <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', minWidth: 16 }}>
                    {i + 1}.
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                      {step.label}
                    </span>
                    <div style={{
                      fontSize: 10, color: 'var(--text-2)',
                      fontFamily: 'var(--font-mono)', marginTop: 2,
                      maxHeight: 40, overflow: 'hidden', wordBreak: 'break-all',
                    }}>
                      {step.output.slice(0, 120)}{step.output.length > 120 ? '…' : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 9, color: step.scoreAfter > 50 ? '#00e87a' : 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                    {step.scoreAfter}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InputProfile({ profile }) {
  if (!profile) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      <StatPill label="H"   value={`${profile.entropy.toFixed(2)} bits`} color="#a78bfa" />
      <StatPill label="IC"  value={profile.ic.toFixed(4)}                color="#00d4ff" />
      <StatPill label="PR"  value={`${Math.round(profile.printableRatio * 100)}%`} color="#00e87a" />
      <StatPill label="len" value={profile.length}                       color="#ffd700" />
      {profile.containsFlag    && <StatPill label="🏁" value="flag pattern" color="#00e87a" />}
      {profile.isLikelyCipher  && <StatPill label="IC→" value="monoalpha"  color="#a78bfa" />}
      {profile.isLikelyPolyalpha && <StatPill label="IC→" value="polyalpha" color="#fb923c" />}
      {profile.isLikelyEncoded && <StatPill label="H→"  value="encoded"    color="#ffd700" />}
      {profile.isLikelyEncrypted && <StatPill label="H→" value="encrypted" color="#ff3d5a" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────

export default function CryptanalysisView({ onNavigate }) {
  const beginner  = useContext(BeginnerContext);
  const [input,   setInput]   = useState('');
  const [results, setResults] = useState(null);   // null = not run yet
  const [detections, setDetections] = useState([]);
  const [profile,    setProfile]    = useState(null);
  const [running,    setRunning]    = useState(false);
  const [elapsed,    setElapsed]    = useState(0);
  const [maxDepth,   setMaxDepth]   = useState(3);
  const [showAll,    setShowAll]    = useState(false);
  const timerRef = useRef(null);

  const run = useCallback(() => {
    if (!input.trim()) return;
    setRunning(true);
    setResults(null);

    // Profile + detect immediately (synchronous, cheap)
    const prof = profileInput(input);
    const dets = detect(input);
    setProfile(prof);
    setDetections(dets);

    // Run pipeline in next tick so UI can update
    const t0 = performance.now();
    setTimeout(() => {
      try {
        const res = analyse(input, { maxDepth });
        const t1  = performance.now();
        setResults(res);
        setElapsed(Math.round(t1 - t0));
      } finally {
        setRunning(false);
      }
    }, 10);
  }, [input, maxDepth]);

  const clear = () => {
    setInput('');
    setResults(null);
    setDetections([]);
    setProfile(null);
  };

  const loadExample = ({ input: ex }) => {
    setInput(ex);
    setResults(null);
    setDetections([]);
    setProfile(null);
  };

  const displayedResults = results
    ? (showAll ? results : results.slice(0, 5))
    : [];

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 0 40px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>🧬</span>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'var(--font-mono)', margin: 0 }}>
            Smart Cryptanalysis
          </h1>
          <span style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 10,
            background: '#00d4ff14', border: '1px solid #00d4ff30',
            color: '#00d4ff', fontFamily: 'var(--font-mono)',
          }}>
            AUTO · MULTI-LAYER
          </span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
          Paste any ciphertext. The engine detects encoding types, chains up to {maxDepth} transforms,
          scores each candidate by English likelihood, and ranks results by confidence.
        </p>
      </div>

      {/* ── Examples ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
        {EXAMPLES.map(ex => (
          <button key={ex.label} onClick={() => loadExample(ex)} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '3px 9px', cursor: 'pointer',
            fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--font-mono)',
            transition: 'border-color .15s',
          }}>
            {ex.label}
          </button>
        ))}
      </div>

      {/* ── Input area ── */}
      <textarea
        value={input}
        onChange={e => { setInput(e.target.value); setResults(null); setDetections([]); setProfile(null); }}
        onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run(); }}
        placeholder="Paste ciphertext, encoded string, or CTF challenge here…"
        spellCheck={false}
        style={{
          width: '100%', minHeight: 110, resize: 'vertical',
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '10px 12px',
          fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-1)',
          outline: 'none', boxSizing: 'border-box',
        }}
      />

      {/* ── Options + Run ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        <button
          onClick={run}
          disabled={!input.trim() || running}
          style={{
            background:  input.trim() && !running ? 'var(--accent)' : 'var(--bg-hover)',
            color:       input.trim() && !running ? '#000'          : 'var(--text-3)',
            border:      'none', borderRadius: 5, padding: '7px 20px',
            fontFamily:  'var(--font-mono)', fontSize: 12, fontWeight: 700,
            cursor:      input.trim() && !running ? 'pointer' : 'not-allowed',
            transition:  'background .2s',
          }}
        >
          {running ? '⟳ Analysing…' : '⚡ Analyse  (Ctrl+↵)'}
        </button>

        {/* Max depth selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Depth:</span>
          {[1, 2, 3].map(d => (
            <button key={d} onClick={() => setMaxDepth(d)} style={{
              background:   maxDepth === d ? 'var(--accent-dim)' : 'var(--bg-hover)',
              border:       `1px solid ${maxDepth === d ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 4, padding: '3px 9px',
              fontFamily:   'var(--font-mono)', fontSize: 10,
              color:        maxDepth === d ? 'var(--accent)' : 'var(--text-3)',
              cursor:       'pointer',
            }}>
              {d}
            </button>
          ))}
        </div>

        {input && (
          <button onClick={clear} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
          }}>
            ✕ Clear
          </button>
        )}

        {results && (
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
            {results.length} result{results.length !== 1 ? 's' : ''} · {elapsed}ms
          </span>
        )}
      </div>

      {/* ── Input profile ── */}
      {profile && <InputProfile profile={profile} />}

      {/* ── Detection panel ── */}
      {detections.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 8, letterSpacing: '.08em' }}>
            DETECTED FORMATS ({detections.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 6 }}>
            {detections.slice(0, 6).map((d, i) => (
              <DetectionBadge key={i} det={d} />
            ))}
          </div>
          {detections.length > 6 && (
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>
              + {detections.length - 6} more candidates
            </div>
          )}
        </div>
      )}

      {/* ── Results panel ── */}
      {results !== null && (
        <div style={{ marginTop: 20 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 10,
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '.08em' }}>
              PIPELINE RESULTS
            </div>
            {results.length === 0 && (
              <span style={{ fontSize: 10, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                No decodable paths found — try a different input or increase depth
              </span>
            )}
          </div>

          {displayedResults.length === 0 && results.length === 0 && (
            <div style={{
              padding: '24px', textAlign: 'center',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--text-3)', fontSize: 12,
            }}>
              No confident decoding paths were found.<br />
              <span style={{ fontSize: 10 }}>
                This may be a hash, custom cipher, or encrypted data.
                Try the individual tools in the sidebar for deeper analysis.
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {displayedResults.map((r, i) => (
              <ResultCard key={i} result={r} index={i} />
            ))}
          </div>

          {results.length > 5 && (
            <button
              onClick={() => setShowAll(a => !a)}
              style={{
                display: 'block', width: '100%', marginTop: 10,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 5, padding: '7px', cursor: 'pointer',
                fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--font-mono)',
              }}
            >
              {showAll ? '▲ Show fewer' : `▼ Show all ${results.length} results`}
            </button>
          )}
        </div>
      )}

      {/* ── Beginner help ── */}
      {beginner && !results && (
        <div style={{
          marginTop: 20, padding: '14px 16px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 6, fontSize: 11, color: 'var(--text-2)',
        }}>
          <strong style={{ color: 'var(--text-1)' }}>How this works:</strong>
          <ol style={{ margin: '8px 0 0 16px', lineHeight: 1.8 }}>
            <li>Paste any encoded or encrypted text above.</li>
            <li>The engine detects what type it might be (Base64, Hex, Caesar, etc.).</li>
            <li>It tries chaining up to {maxDepth} transforms automatically.</li>
            <li>Results are ranked by English readability, printability, and entropy.</li>
            <li>A 🏁 badge means a CTF flag pattern was found!</li>
          </ol>
        </div>
      )}
    </div>
  );
}
