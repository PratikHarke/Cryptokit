/**
 * aggressiveSolver.js — v9
 * Aggressive beam-search orchestrator.
 *
 * Sits ABOVE pipelineEngine.analyse() — does not replace it.
 * CryptanalysisView → pipelineEngine.analyse()   (unchanged)
 * AggressiveSolverView → aggressiveSolve()        (new)
 *
 * Both share: detector.js, scorer.js, pipelineEngine.TRANSFORMS, all crypto tools.
 *
 * Key improvements over v8 BFS:
 *  1. Beam search: per-depth top-K pruning instead of flat 400-node cap
 *  2. scoreBreakdown: all sub-scores exposed per result
 *  3. intermediateResults: score at every step in the chain
 *  4. Explainability: why each result was explored and kept
 *  5. StateCache: FNV-1a hash dedup instead of string prefix Set
 *  6. Aggressive mode: lower confidence floor, more candidates, deeper search
 *  7. XOR repeating-key wired into transforms (was in xorAdvanced but unused)
 *  8. Flag-bearing branches always surface regardless of numeric score
 */

import { detect }                             from './detector.js';
import { scoreBreakdown }                     from './scorer.js';
import { StateCache }                         from './stateCache.js';
import { pruneBeam, branchScore, DEFAULT_BEAM, AGGRESSIVE_BEAM } from './branchManager.js';
import { explainResult }                      from './explainability.js';
import { TRANSFORMS }                         from './pipelineEngine.js';
import { rot13 }                              from './caesar.js';
import { atbash }                             from './atbash.js';
import { bfCaesar }                           from './analysis.js';

// ── Extra transforms for aggressive mode ─────────────────────────────────────
// These extend the base TRANSFORMS map without modifying pipelineEngine.

function rot47(text) {
  const out = text.replace(/[!-~]/g, c =>
    String.fromCharCode(((c.charCodeAt(0) - 33 + 47) % 94) + 33));
  return out === text ? null : { output: out, label: 'ROT-47', params: {} };
}

function reverseStr(text) {
  const out = text.split('').reverse().join('');
  return out === text ? null : { output: out, label: 'Reverse', params: {} };
}

/** All 25 Caesar shifts as separate results — used in aggressive mode */
function caesarAll(text) {
  if (!/[a-zA-Z]/.test(text)) return [];
  try {
    const shifts = bfCaesar(text).filter(r => r.score > 5);
    return shifts.map(r => ({
      output: r.text,
      label:  `Caesar(shift=${r.shift})`,
      params: { shift: r.shift },
    }));
  } catch { return []; }
}

const AGGRESSIVE_EXTRA = { rot47, reverseStr };

// ── Result types ──────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AggressiveResult
 * @property {string[]}              steps
 * @property {string}                output
 * @property {number}                confidence
 * @property {Object}                scoreBreakdown
 * @property {Object[]}              intermediateResults
 * @property {import('./explainability.js').ExplainRecord} explanation
 * @property {{ depth:number, branchRank:number, prunedAlternatives:number, stateCache:Object }} metadata
 */

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Run the aggressive beam-search solver.
 *
 * @param {string} input
 * @param {'standard'|'aggressive'} [mode='standard']
 * @returns {AggressiveResult[]}  Up to 20 results, sorted best-first
 */
export function aggressiveSolve(input, mode = 'standard', options = {}) {
  const { signal, maxDepth: optMaxDepth, onStep } = options;
  const original = input.trim();
  if (!original) return [];

  const config = mode === 'aggressive' ? AGGRESSIVE_BEAM : DEFAULT_BEAM;
  const resolvedMaxDepth = optMaxDepth ?? config.maxDepth ?? 5;
  const cache  = new StateCache();

  // ── Initial frontier ───────────────────────────────────────────────────────
  let frontier = [{
    text:            original,
    chain:           [],
    depth:           0,
    intermediates:   [],
    cumulativeScore: 0,
  }];

  const collected  = [];
  let   totalNodes = 0;
  let   prunedCount = 0;

  // ── Beam search loop ───────────────────────────────────────────────────────
  for (let depth = 0; depth < resolvedMaxDepth && frontier.length > 0; depth++) {
    const nextDepthBranches = [];

    // Notify UI of current depth and what's being tried
    if (onStep) {
      const bestScore = collected.length
        ? Math.max(...collected.slice(-20).map(b => b.cumulativeScore))
        : 0;
      const sample = frontier.slice(0, 3).map(n => n.chain.join(" → ") || "input");
      onStep({
        depth,
        maxDepth:   resolvedMaxDepth,
        trying:     sample,
        candidates: collected.length,
        bestScore:  Math.round(bestScore),
        pruned:     prunedCount,
      });
    }

    // Early-stop: flag found at previous depth with high confidence
    if (depth > 0) {
      const flagFound = collected.find(b => /flag\{/i.test(b.text) && b.cumulativeScore >= 80);
      if (flagFound) break;
    }

    for (const node of frontier) {
      // Check AbortController on every node — allows sub-layer cancellation
      if (signal?.aborted) break;
      if (totalNodes++ >= config.maxNodes) break;
      // True early exit: flag found with high confidence → stop all computation
      const earlyFlagBranch = collected.find(b =>
        /flag\{/i.test(b.text) && b.cumulativeScore >= 90
      );
      if (earlyFlagBranch) { signal?.abort?.(); break; }

      // Detect transforms applicable to current text
      const detections = detect(node.text)
        .filter(d => d.category !== 'hash')
        .filter(d => d.confidence >= config.minBranchScore)
        .slice(0, config.beamWidth);

      // Build transform list: standard detections + aggressive extras in aggressive mode
      const transformsToTry = [...detections];

      // Expand: attempt each detected transform
      for (const det of transformsToTry) {
        const fn = TRANSFORMS[det.label];
        if (!fn) continue;

        let results;
        try {
          const r = fn(node.text);
          results = r ? [r] : [];
        } catch { continue; }

        if (!results.length) continue;

        for (const r of results) {
          if (!r?.output) continue;
          if (r.output === node.text) { prunedCount++; continue; }   // noop

          const chainLabels = [...node.chain.map(s => s.label), r.label];
          if (cache.has(r.output, chainLabels)) { prunedCount++; continue; }  // duplicate

          const bd       = scoreBreakdown(r.output, original);
          const cumScore = branchScore({ text: r.output, depth: depth + 1 }, original);

          // Flag-bearing always passes; others need the floor
          const isFlag = /flag\{/i.test(r.output);
          if (!isFlag && cumScore < config.minBranchScore && depth > 0) {
            prunedCount++;
            continue;
          }

          const step = {
            label:      r.label,
            toolId:     det.toolId ?? r.label.toLowerCase().replace(/\s/g, '_'),
            params:     r.params ?? {},
            output:     r.output,
            scoreAfter: bd.confidence,
            scoreBreak: bd.breakdown ?? {},
          };

          const intermediate = {
            step:       r.label,
            output:     r.output.slice(0, 200),
            confidence: bd.confidence,
            entropy:    bd.entropyDelta,
            flagScore:  bd.flagScore ?? 0,
          };

          const newBranch = {
            text:            r.output,
            chain:           [...node.chain, step],
            depth:           depth + 1,
            intermediates:   [...node.intermediates, intermediate],
            cumulativeScore: cumScore,
          };

          nextDepthBranches.push(newBranch);
          collected.push(newBranch);
        }
      }

      // In aggressive mode, also try non-detected extras (ROT-47, Reverse, all Caesars)
      if (mode === 'aggressive') {
        // Brute-force all Caesar shifts
        const caesarResults = caesarAll(node.text);
        for (const r of caesarResults) {
          if (!r?.output || r.output === node.text) continue;
          const chainLabels = [...node.chain.map(s => s.label), r.label];
          if (cache.has(r.output, chainLabels)) continue;

          const bd       = scoreBreakdown(r.output, original);
          const cumScore = branchScore({ text: r.output, depth: depth + 1 }, original);
          if (cumScore < config.minBranchScore && !/flag\{/i.test(r.output)) continue;

          const step = {
            label: r.label, toolId: 'bf_caesar',
            params: r.params, output: r.output,
            scoreAfter: bd.confidence, scoreBreak: bd.breakdown ?? {},
          };
          const branch = {
            text: r.output,
            chain: [...node.chain, step],
            depth: depth + 1,
            intermediates: [...node.intermediates, {
              step: r.label, output: r.output.slice(0, 200),
              confidence: bd.confidence, entropy: bd.entropyDelta, flagScore: bd.flagScore ?? 0,
            }],
            cumulativeScore: cumScore,
          };
          nextDepthBranches.push(branch);
          collected.push(branch);
        }

        // ROT-47 and Reverse
        for (const [, fn] of Object.entries(AGGRESSIVE_EXTRA)) {
          try {
            const r = fn(node.text);
            if (!r?.output || r.output === node.text) continue;
            const chainLabels = [...node.chain.map(s => s.label), r.label];
            if (cache.has(r.output, chainLabels)) continue;
            const bd = scoreBreakdown(r.output, original);
            const cumScore = branchScore({ text: r.output, depth: depth + 1 }, original);
            if (cumScore < config.minBranchScore && !/flag\{/i.test(r.output)) continue;
            const step = {
              label: r.label, toolId: r.label.toLowerCase(),
              params: {}, output: r.output,
              scoreAfter: bd.confidence, scoreBreak: bd.breakdown ?? {},
            };
            const branch = {
              text: r.output,
              chain: [...node.chain, step],
              depth: depth + 1,
              intermediates: [...node.intermediates, {
                step: r.label, output: r.output.slice(0, 200),
                confidence: bd.confidence, entropy: bd.entropyDelta, flagScore: bd.flagScore ?? 0,
              }],
              cumulativeScore: cumScore,
            };
            nextDepthBranches.push(branch);
            collected.push(branch);
          } catch { /* skip */ }
        }
      }
    }

    // Beam pruning: keep top beamWidth candidates to explore next depth
    frontier = pruneBeam(nextDepthBranches, config);
  }

  // ── Check for early-exit flag
  const earlyFlagBranch = collected.find(b => /flag\{/i.test(b.text) && b.cumulativeScore >= 90);
  const earlyExit = !!(earlyFlagBranch || signal?.aborted);
  const earlyExitReason = earlyFlagBranch
    ? '🏁 Flag found — scan stopped early'
    : signal?.aborted ? 'Scan cancelled' : undefined;

  // ── Rank collected results ─────────────────────────────────────────────────
  const ranked = collected
    .sort((a, b) => {
      const aFlag = /flag\{/i.test(a.text) ? 100 : 0;
      const bFlag = /flag\{/i.test(b.text) ? 100 : 0;
      return (bFlag + b.cumulativeScore) - (aFlag + a.cumulativeScore);
    })
    .filter((r, i, arr) => {
      // Deduplicate identical outputs at the result-format stage
      return arr.findIndex(x => x.text === r.text) === i;
    })
    .slice(0, 20);

  // ── Format output ──────────────────────────────────────────────────────────
  const results = ranked.map((branch, rank) => {
    const bd = scoreBreakdown(branch.text, original);
    const hasFlag = /flag\{[^}]+\}/i.test(branch.text);
    // Confidence decay: each decode layer reduces confidence by 10%
    // Flag detection is strong evidence — skip decay if flag found
    const decayFactor = hasFlag ? 1.0 : Math.pow(0.90, Math.max(0, branch.depth - 1));
    const adjustedConfidence = Math.round(bd.confidence * decayFactor);
    return {
      steps:               branch.chain.map(s => s.label),
      stepsWithIds:        branch.chain.map(s => ({ label: s.label, toolId: s.toolId, params: s.params })),
      output:              branch.text,
      confidence:          adjustedConfidence,
      rawConfidence:       bd.confidence,   // pre-decay, for display
      depth:               branch.depth,
      decayFactor:         +decayFactor.toFixed(3),
      scoreBreakdown:      bd.breakdown ?? {},
      intermediateResults: branch.intermediates,
      explanation:         explainResult(
        branch.chain, branch.text, original, rank + 1, prunedCount,
      ),
      metadata: {
        depth:              branch.depth,
        branchRank:         rank + 1,
        prunedAlternatives: prunedCount,
        stateCache:         cache.stats,
      },
    };
  });
  return { results, earlyExit, earlyExitReason };
}
