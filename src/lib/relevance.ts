import type { FillComparison } from '../engine/bracketFillCompare.ts'
import type { LeverResult } from '../engine/levers.ts'
import { fillNudge } from './bracketFillNudge.ts'

// « DOES THIS MOVE MY HOUSEHOLD? » — the pure decisions behind what Décider shows folded. A section whose machinery changes nothing for THIS household
// presents as its heading, one line saying so, and a closed fold; nothing is removed. Every rule here is conservative the same way: a search that has not
// answered (`null` / `undefined`) is NEVER pruned — absence of evidence is not irrelevance.

/**
 * « Fonte du REER » is relevant when the comparison has not answered yet, or when a way of melting the RRSP clearly beats the household's own (the same bar as the
 * sentence on the answer: lib/bracketFillNudge.ts), OR when the household melts and « stop melting » comes out ahead of its own way: the nudge never points at that
 * (it only points at a way that melts), but the panel's « arrêter de fondre » guidance is exactly what this household needs. The materiality is the comparison's own:
 * `best` differs from `current` only when engine/bracketFillCompare.ts `fillAhead` found the best way clearly ahead (the plan holds where the household's does not,
 * or under it by more than 1 % of the tax / 500 $), so no second threshold is invented here. Otherwise (the household's own way is the best, or a melting way
 * ahead by a gap not worth a sentence) the section has nothing to tell this household.
 */
export function fonteRelevant(fill: FillComparison | null): boolean {
  if (fill === null) return true
  if (fillNudge(fill) !== null) return true
  return fill.best !== fill.current && fill.outcomes[fill.best].choice === null
}

/**
 * A lever moves the household by nothing when it neither moves the age (0 whole years) nor the money left at the end of the plan by a sum worth showing. The money bar is
 * the one the list already draws its « +24 k$ » line at (DecideView: |endGain| >= 1 000 $): under it the row would read « même âge » and nothing else, which is
 * exactly the row that adds nothing. ANY measurable year or dollar keeps the lever; a lever with no comparison at all (null years) is kept too.
 */
export const LEVER_MIN_DOLLARS = 1_000

export function leverPruned(lever: Pick<LeverResult, 'yearsGained' | 'endGain'>): boolean {
  if (lever.yearsGained !== 0) return false
  return lever.endGain === null || Math.abs(lever.endGain) < LEVER_MIN_DOLLARS
}
