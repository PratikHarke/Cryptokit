/**
 * explainability.js — v9
 * Generates human-readable reasoning for each AggressiveSolver result.
 * Tells the user: why a path was explored, why it was kept/ranked, and
 * a step-by-step score trace.
 */

import { scoreBreakdown } from './scorer.js';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ExplainRecord
 * @property {string}   whyExplored  - Why the first transform was attempted
 * @property {string}   whyKept      - Why this result ranked where it did
 * @property {string[]} scoreTrace   - One line per step showing score deltas
 */

// ── Explain a kept result ─────────────────────────────────────────────────────

/**
 * Generate human-readable reasoning for a solved result.
 *
 * @param {import('./branchManager.js').StepRecord[]} steps
 * @param {string} finalOutput
 * @param {string} original
 * @param {number} branchRank      - 1-indexed rank in final results
 * @param {number} prunedCount     - Total branches pruned during search
 * @returns {ExplainRecord}
 */
export function explainResult(steps, finalOutput, original, branchRank, prunedCount) {
  const bd = scoreBreakdown(finalOutput, original);

  // Step-by-step score trace
  const scoreTrace = steps.map((s, i) => {
    const br = s.scoreBreak ?? {};
    return (
      `Step ${i + 1} [${s.label}]: confidence=${s.scoreAfter}` +
      ` (printable=${br.printable ?? '?'}, words=${br.englishWords ?? '?'}, flag=${br.flagPattern ?? '?'})`
    );
  });

  // Why explored
  const whyExplored = steps[0]
    ? `Detector flagged "${steps[0].label}" on input with sufficient confidence`
    : 'Root node — always explored';

  // Why kept: enumerate the strongest signals
  const reasons = [];
  const bk = bd.breakdown ?? {};
  if (bk.printable     >= 20) reasons.push(`printable ASCII ${Math.round(bd.printableRatio * 100)}%`);
  if (bk.englishWords  >= 20) reasons.push(`English-word score ${bk.englishWords}/40`);
  if (bk.flagPattern   >= 18) reasons.push(`CTF flag pattern detected`);
  if (bk.chiImprove    >= 15) reasons.push(`chi-squared improved vs input`);
  if (bk.icBonus       >= 7)  reasons.push(`IC near English target`);
  if (prunedCount > 0)        reasons.push(`beat ${prunedCount} pruned alternatives`);

  const whyKept = reasons.length
    ? `Ranked #${branchRank}: ` + reasons.join(', ')
    : `Ranked #${branchRank}: overall confidence ${bd.confidence}`;

  return { whyExplored, whyKept, scoreTrace };
}

// ── Explain a pruned branch ───────────────────────────────────────────────────

/**
 * @param {{ cumulativeScore:number, text:string }} branch
 * @param {'score'|'duplicate'|'noop'|'depth'} reason
 * @returns {string}
 */
export function explainPruned(branch, reason) {
  const msgs = {
    score:     `Branch pruned: score ${branch.cumulativeScore} below minimum threshold`,
    duplicate: `Branch pruned: identical output already explored via another path`,
    noop:      `Branch pruned: transform produced no change to text`,
    depth:     `Branch pruned: exceeded maximum search depth`,
  };
  return msgs[reason] ?? 'Branch pruned.';
}
