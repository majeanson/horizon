import { citedLeaves, plain, type Cited, type Plain } from './cited.ts'
import { PLAN_RREGOP } from './plans.ts'
import { resolveYear, type Indexation } from './project.ts'
import { P2026 } from './2026.ts'
import { RRQ_MGA_HISTORY, RRQ_YAMPE_HISTORY } from './rrqHistory.ts'
import { CHILD_COSTS, CHILD_COST_INCOME_LEVELS, CPI_ANNUAL } from './childCosts.ts'
import { TFSA_LIMIT_HISTORY } from './tfsaHistory.ts'
import { TYPICAL_BY_AGE, TYPICAL_BY_WEALTH, TYPICAL_SPENDING_BY_AGE, TYPICAL_SPENDING_BY_HOUSEHOLD, TYPICAL_SPENDING_BY_INCOME } from './typical.ts'
import type { YearParams } from './types.ts'

// The registry of years whose figures a person can open and check, and the one function the
// engine uses to read a year: `paramsFor(year, assumptions)`.
//
// To add a tax year: create params/<year>.ts as a `satisfies YearParams` literal, add it to KNOWN,
// add params/<year>.test.ts, then `npm run sources`. Nothing else in the engine changes.

export const KNOWN: Readonly<Record<number, YearParams>> = { 2026: P2026 }

/** Cross-year observations: tables that belong to no single year. They are listed in SOURCES.md too. */
export const SERIES: ReadonlyArray<{ name: string; cited: Cited<unknown> }> = [
  { name: 'rrq.mgaHistory', cited: RRQ_MGA_HISTORY },
  { name: 'rrq.yampeHistory', cited: RRQ_YAMPE_HISTORY },
  { name: 'accounts.tfsaLimitHistory', cited: TFSA_LIMIT_HISTORY },
  // What a typical Canadian household holds and spends (Statistics Canada): the start of an estimate for someone who cannot read their own figures.
  { name: 'typical.holdingsByAge', cited: TYPICAL_BY_AGE },
  { name: 'typical.holdingsByWealth', cited: TYPICAL_BY_WEALTH },
  { name: 'typical.spendingByHousehold', cited: TYPICAL_SPENDING_BY_HOUSEHOLD },
  { name: 'typical.spendingByIncome', cited: TYPICAL_SPENDING_BY_INCOME },
  { name: 'typical.spendingByAge', cited: TYPICAL_SPENDING_BY_AGE },
  // What a child costs (Statistics Canada), and the price index that moves it to today's dollars.
  { name: 'kids.costs', cited: CHILD_COSTS },
  { name: 'kids.incomeLevels', cited: CHILD_COST_INCOME_LEVELS },
  { name: 'kids.cpi', cited: CPI_ANNUAL },
  // The rules of the pension plans the app can pre-fill (not a tax year's figures: they change by legislation).
  ...citedLeaves(PLAN_RREGOP, 'plan.rregop').map((l) => ({ name: l.path, cited: l.cited as Cited<unknown> })),
]

export type PlainYear = Plain<YearParams> & { projected: boolean }

/**
 * The figures for `year`: its own, if a page can be cited for it, else the last known year moved
 * by each figure's index rule — and `projected: true` says which. A year before the first known
 * one is refused: the past comes from the person's own statement, never from this engine.
 */
export function paramsFor(year: number, indexation: Indexation): PlainYear {
  return resolveYear(KNOWN, year, indexation)
}

/** The plain figures of a known year, for tests and tooling that must not project. */
export function knownYear(year: number): Plain<YearParams> {
  const y = KNOWN[year]
  if (!y) throw new Error(`no known parameters for ${year}`)
  return plain(y)
}

export const LAST_KNOWN_YEAR = Math.max(...Object.keys(KNOWN).map(Number))
