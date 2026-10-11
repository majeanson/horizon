import type { WithdrawalOrders } from '../engine/withdrawalOrders.ts'

// « UN AUTRE ORDRE DE RETRAIT VAUT LE COUP » — on the answer, one sentence when the household's own order of drawing the accounts is clearly beaten by another. The six orders are the
// engine's (engine/withdrawalOrders.ts, shown whole on « Stratégies »); this only decides when the gap is worth SAYING on the answer, which is a higher bar than the ranking's own
// (the ranking marks an order « en tête » at 1 % of the tax or 500 $; a sentence on the answer needs a gap a person would act on).

/** The least lifetime tax (today's dollars) that is worth a sentence on the answer, as a share of the household's own and in dollars: both must be passed. */
export const NUDGE_MIN_SHARE = 0.03
export const NUDGE_MIN_DOLLARS = 10_000

export interface OrderNudge {
  /** Index in `outcomes` of the order to point at. */
  best: number
  /** Years earlier the best order lets the household retire (0 when none). */
  yearsEarlier: number
  /** Lifetime tax saved, today's dollars (0 when the gain is in years only). */
  taxSaved: number
}

/** The order to point at, or null when the household's own is the best one or the gap is not worth a sentence. */
export function orderNudge(orders: WithdrawalOrders): OrderNudge | null {
  if (orders.best === orders.current) return null
  const own = orders.outcomes[orders.current]
  const best = orders.outcomes[orders.best]
  // An order that works where the household's own never does, or that works earlier: the age is the finding.
  const earlier = best.earliestOk !== null && (own.earliestOk === null || best.earliestOk < own.earliestOk)
  const yearsEarlier = earlier ? (own.earliestOk === null ? 0 : own.earliestOk - best.earliestOk!) : 0
  const taxSaved = Math.max(0, own.lifetimeTax - best.lifetimeTax)
  if (earlier) return { best: orders.best, yearsEarlier, taxSaved }
  if (taxSaved >= NUDGE_MIN_DOLLARS && taxSaved >= NUDGE_MIN_SHARE * own.lifetimeTax) return { best: orders.best, yearsEarlier: 0, taxSaved }
  return null
}
