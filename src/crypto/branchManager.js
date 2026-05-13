/**
 * branchManager.js — v9
 * Beam search controller: replaces the flat BFS queue with a per-depth beam.
 *
 * Why beam over pure BFS:
 *   A CTF input like Base64 → XOR(255 keys) → Caesar(25 shifts) produces
 *   ~1,700 paths at depth 3 with aggressive candidate counts. Beam search
 *   hard-limits breadth at each depth layer, so exploration stays bounded
 *   while still following the best-scoring signal.
 *
 * Flag-bearing branches are never pruned regardless of numeric score.
 */

import { scoreBreakdown } from './scorer.js';

// ── Config shapes ─────────────────────────────────────────────────────────────

/** @typedef {{ maxDepth:number, beamWidth:number, minBranchScore:number, maxNodes:number, aggressiveMode:boolean }} BeamConfig */

export const DEFAULT_BEAM = {
  maxDepth:       3,
  beamWidth:      8,
  minBranchScore: 15,
  maxNodes:       400,
  aggressiveMode: false,
};

export const AGGRESSIVE_BEAM = {
  maxDepth:       4,
  beamWidth:      12,
  minBranchScore: 5,    // explore low-confidence branches
  maxNodes:       800,
  aggressiveMode: true,
};

// ── Branch type ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Branch
 * @property {string}               text
 * @property {StepRecord[]}         chain
 * @property {number}               depth
 * @property {IntermediateResult[]} intermediates
 * @property {number}               cumulativeScore
 */

/**
 * @typedef {Object} StepRecord
 * @property {string} label
 * @property {string} toolId
 * @property {Object} params
 * @property {string} output
 * @property {number} scoreAfter
 * @property {Object} scoreBreak   - breakdown sub-scores
 */

/**
 * @typedef {Object} IntermediateResult
 * @property {string} step
 * @property {string} output
 * @property {number} confidence
 * @property {number} entropy
 * @property {number} flagScore
 */

// ── Beam pruning ──────────────────────────────────────────────────────────────

/**
 * Given all candidate branches generated at depth D, keep only top beamWidth.
 * Flag-bearing branches are always promoted — they are never cut by the beam.
 *
 * @param {Branch[]}   branches
 * @param {BeamConfig} config
 * @returns {Branch[]}
 */
export function pruneBeam(branches, config) {
  const flagBranches   = branches.filter(b => /flag\{/i.test(b.text));
  const normalBranches = branches
    .filter(b => !/flag\{/i.test(b.text))
    .sort((a, b) => b.cumulativeScore - a.cumulativeScore)
    .slice(0, Math.max(0, config.beamWidth - flagBranches.length));

  return [...flagBranches, ...normalBranches];
}

// ── Branch scoring ────────────────────────────────────────────────────────────

/**
 * Score a branch with a small depth penalty so shorter successful chains
 * are preferred over equivalent long chains.
 * Penalty: 2 points per depth hop.
 *
 * @param {Branch} branch
 * @param {string} original - Original input text
 * @returns {number}
 */
export function branchScore(branch, original) {
  const { confidence } = scoreBreakdown(branch.text, original);
  const depthPenalty   = branch.depth * 2;
  return Math.max(0, confidence - depthPenalty);
}
