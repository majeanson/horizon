import type { FillComparison, FillChoice } from '../engine/bracketFillCompare.ts'

// « FONDRE LE REER VAUT LE COUP » — on the answer, one sentence when a way of melting down the RRSP clearly beats the household's own plan. The ways are the engine's
// (engine/bracketFillCompare.ts, shown whole on « Stratégies »); this only decides when the gap is worth SAYING on the answer — the same bar as lib/orderNudge.ts: the ranking marks
// a way « en tête » at 1 % of the tax or 500 $, a sentence on the answer needs a gap a person would act on. Only a way that MELTS is pointed at: « stop melting » is not a nudge.

export const NUDGE_MIN_SHARE = 0.03
export const NUDGE_MIN_DOLLARS = 10_000

export interface FillNudge {
  /** Index in `outcomes` of the way to point at. */
  best: number
  yearsEarlier: number
  taxSaved: number
}

export const tabOf = (choice: FillChoice): 'none' | 'bracket1' | 'oas' => choice ?? 'none'
export const choiceOf = (tab: 'none' | 'bracket1' | 'oas'): FillChoice => (tab === 'none' ? null : tab)

/** The way to point at, or null when the household's own is the best one, the best is « no meltdown », or the gap is not worth a sentence. */
export function fillNudge(c: FillComparison): FillNudge | null {
  if (c.best === c.current || c.outcomes[c.best].choice === null) return null
  const own = c.outcomes[c.current]
  const best = c.outcomes[c.best]
  const earlier = best.earliestOk !== null && (own.earliestOk === null || best.earliestOk < own.earliestOk)
  const yearsEarlier = earlier ? (own.earliestOk === null ? 0 : own.earliestOk - best.earliestOk!) : 0
  const taxSaved = Math.max(0, own.lifetimeTax - best.lifetimeTax)
  if (earlier) return { best: c.best, yearsEarlier, taxSaved }
  if (taxSaved >= NUDGE_MIN_DOLLARS && taxSaved >= NUDGE_MIN_SHARE * own.lifetimeTax) return { best: c.best, yearsEarlier: 0, taxSaved }
  return null
}
