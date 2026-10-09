import { everyoneAt, retireAt, runScenario } from './retireAt.ts'
import type { Assumptions, Household } from './types.ts'

// « WHAT MOVES THE ANSWER MOST? » — a handful of changes a household could actually make, each tried on its own against the plan as it
// stands, ranked by how many years earlier they let the household retire. The same plain search as everywhere else (`retireAt`, the earliest
// age with no shortfall); a lever is only a way of altering the inputs, so nothing here is a rule of its own.

export const LEVER_IDS = ['spend10', 'save500', 'returns1', 'pensions70'] as const
export type LeverId = (typeof LEVER_IDS)[number]

/** Dollars a month added to savings by the « save more » lever. */
export const SAVE_MORE_PER_MONTH = 500

type Change = (h: Household, a: Assumptions) => [Household, Assumptions]

const CHANGES: Record<LeverId, Change> = {
  // Live on 10 % less in retirement.
  spend10: (h, a) => [{ ...h, spending: { ...h.spending, retiredToday: h.spending.retiredToday * 0.9 } }, a],
  // Put 500 $ a month more into the TFSA of whoever is working longest (the account whose growth is never taxed).
  save500: (h, a) => {
    const i = h.persons.reduce((best, p, k) => (p.retirementAge - (a.today.year - p.birth.year) > h.persons[best].retirementAge - (a.today.year - h.persons[best].birth.year) ? k : best), 0)
    const persons = h.persons.map((p, k) => (k === i ? { ...p, accounts: { ...p.accounts, tfsa: { ...p.accounts.tfsa, annualContribution: p.accounts.tfsa.annualContribution + SAVE_MORE_PER_MONTH * 12 } } } : p))
    return [{ ...h, persons }, a]
  },
  // One point more a year on every account.
  returns1: (h, a) => [h, { ...a, returns: { nonReg: a.returns.nonReg + 0.01, rrsp: a.returns.rrsp + 0.01, tfsa: a.returns.tfsa + 0.01 } }],
  // Take the QPP and the OAS at 70 instead of when they were set.
  pensions70: (h, a) => [{ ...h, persons: h.persons.map((p) => ({ ...p, rrq: { ...p.rrq, startAge: 70 }, oas: { ...p.oas, startAge: 70 } })) }, a],
}

export interface LeverResult {
  id: LeverId
  /** The earliest age that works with the change (null: none up to 70). */
  earliest: number | null
  /** Years earlier than the plan as it stands (negative: later; null: either side has no age to compare). */
  yearsGained: number | null
  /**
   * What the change does to the net worth at the END of the plan, retiring at the age that works as the plan stands, in today's dollars
   * (null: no age works as it stands). A whole-year answer says « no change » to most single changes; this is the same change in money.
   */
  endGain: number | null
}

/** The earliest age as the plan stands, and each lever's, best first (a lever that finds an age where there was none counts as the best). */
export function leverRanking(h: Household, a: Assumptions): { base: number | null; levers: LeverResult[] } {
  const earliest = (hh: Household, aa: Assumptions) => retireAt(hh, aa, { stopAtFirstOk: true }).earliestOk
  const base = earliest(h, a)
  // The end of the plan in today's dollars, at the base age: the same prices-deflator the rest of the engine's « today's dollars » use.
  const endWorth = (hh: Household, aa: Assumptions): number | null => {
    if (base === null) return null
    const r = runScenario(hh, aa, everyoneAt(hh, base), base)
    const last = r.rows[r.rows.length - 1]
    return r.netWorthAtHorizon / (1 + aa.inflation) ** (last.year - aa.today.year)
  }
  const baseWorth = endWorth(h, a)
  const levers = LEVER_IDS.map((id): LeverResult => {
    const [hh, aa] = CHANGES[id](h, a)
    const e = earliest(hh, aa)
    const w = endWorth(hh, aa)
    return { id, earliest: e, yearsGained: base !== null && e !== null ? base - e : null, endGain: w !== null && baseWorth !== null ? w - baseWorth : null }
  })
  const score = (l: LeverResult) => (l.yearsGained !== null ? l.yearsGained : base === null && l.earliest !== null ? 1000 : -1000)
  // Equal years: the change worth more money at the end of the plan comes first.
  return { base, levers: levers.sort((x, y) => score(y) - score(x) || (y.endGain ?? 0) - (x.endGain ?? 0)) }
}
