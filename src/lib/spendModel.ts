import { retireAt } from '../engine/retireAt.ts'
import type { Assumptions, Household } from '../engine/types.ts'

// « And if we spent less in retirement? » — the model behind the spending lever on Résultats (components/results/SpendView.tsx),
// kept out of the view and the worker so both read ONE definition: the household with another retired spending, the earliest
// age that then works, and what the slider may propose.

/** The slider's reach, in today's dollars a year — the same as the ledger's spending sliders. */
export const SPEND_MIN = 10_000
export const SPEND_MAX = 250_000
export const SPEND_STEP = 500

/** The household as it would be with that retired spending (today's dollars a year). */
export const withRetiredSpending = (h: Household, retiredToday: number): Household => ({ ...h, spending: { ...h.spending, retiredToday } })

/** The earliest age at which the plan lasts once the retired spending is `retiredToday`; null when no age up to 70 does. */
export const spendEarliest = (household: Household, assumptions: Assumptions, retiredToday: number): number | null =>
  retireAt(withRetiredSpending(household, retiredToday), assumptions, { stopAtFirstOk: true }).earliestOk

/** `?spend=` → a spending the slider can hold (rounded to its step, inside its reach), or null for anything unreadable. */
export function parseSpend(text: string | null): number | null {
  const n = Number(text)
  if (text === null || text === '' || !Number.isFinite(n)) return null
  return Math.min(SPEND_MAX, Math.max(SPEND_MIN, Math.round(n / SPEND_STEP) * SPEND_STEP))
}
