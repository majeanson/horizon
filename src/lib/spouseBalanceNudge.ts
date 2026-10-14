import type { SpouseBalance } from '../engine/spouseBalance.ts'

// « ÉGALISER LES REER VAUT LE COUP » — on the answer, one sentence when evening out the two spouses' RRSPs clearly beats the household's plan. The comparison is the engine's
// (engine/spouseBalance.ts, shown whole on « Décider »); this only decides when the gap is worth SAYING on the answer — the same bar as lib/orderNudge.ts: a gap a person would act on.

export const NUDGE_MIN_SHARE = 0.03
export const NUDGE_MIN_DOLLARS = 10_000

export interface SpouseBalanceNudge {
  /** Years earlier the evened-out plan lets the household retire (0 when none). */
  yearsEarlier: number
  /** Lifetime tax saved, today's dollars (0 when the gain is in years only). */
  taxSaved: number
}

/** What to say, or null when the two RRSPs are level, nothing can move, or the gap is not worth a sentence. */
export function spouseBalanceNudge(r: SpouseBalance | null): SpouseBalanceNudge | null {
  if (r === null || r.moved <= 0) return null
  const own = r.current
  const bal = r.balanced
  const earlier = bal.earliestOk !== null && (own.earliestOk === null || bal.earliestOk < own.earliestOk)
  const taxSaved = Math.max(0, r.taxSaved)
  if (earlier) return { yearsEarlier: r.yearsEarlier, taxSaved }
  if (taxSaved >= NUDGE_MIN_DOLLARS && taxSaved >= NUDGE_MIN_SHARE * own.lifetimeTax) return { yearsEarlier: 0, taxSaved }
  return null
}
