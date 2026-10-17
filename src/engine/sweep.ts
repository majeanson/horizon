import { project } from './projection.ts'
import { everyoneAt, MIN_TRY_AGE } from './retireAt.ts'
import type { Assumptions, Household, Scenario } from './types.ts'

// THE SWEEP — one plain question asked many times: « for each retirement age, and for each way of changing the plan, does the money last? » The regret curve, the
// reverse mode, the spouse's pension timing and the stress map are all this grid read differently, so they share it instead of each keeping a loop of its own.
//
// A VARIANT is only a way of altering the inputs (the shape of `levers.ts` CHANGES), so nothing here is a rule of its own: every cell is the SAME projection the rest
// of the app runs, and the identity variant's row equals `retireAt`'s (`sweep.test.ts`). A cell keeps the verdict and three totals and drops the year rows — a grid of a
// hundred projections must not hold a hundred tables in memory. Pure; reads no clock, no network.

/** A change to the plan: the household and assumptions it returns are what the projection runs on. The inputs are never mutated. */
export interface Variant {
  id: string
  apply: (h: Household, a: Assumptions) => [Household, Assumptions]
}

/** « The plan as it stands. » */
export const IDENTITY: Variant = { id: 'plan', apply: (h, a) => [h, a] }

export interface SweepCell {
  /** The retirement age tried. */
  age: number
  /** True when no year of the plan has a shortfall. */
  ok: boolean
  /** The first year with a shortfall, or null. */
  firstShortfallYear: number | null
  /** Everything the household owns at the end of the plan, nominal dollars. */
  netWorthAtHorizon: number
  /** The calendar year the plan ends (the last row's), which says how far the nominal dollars above are from today's. */
  lastYear: number
  /** Income tax and OAS recovery tax over the whole plan, nominal dollars. */
  lifetimeTax: number
  /** What could not be met even with every account empty, summed over the plan, nominal dollars (0 in a plan that works). */
  shortfallTotal: number
}

export interface SweepRow {
  /** The variant this row is for. */
  id: string
  cells: SweepCell[]
  /** The earliest tried age that works, or null. */
  earliestOk: number | null
}

export interface SweepOptions {
  /** The youngest age to try (default 18). Never below an age someone has already reached: nobody retires in the past. */
  from?: number
  /** The oldest age to try (default 70). */
  to?: number
  /** Try every `step`-th age from `from` (default 1): a coarse grid for the heaviest sweeps. */
  step?: number
  /** How a tried age becomes a scenario, given the household the variant produced (default: everyone retires at that age). */
  scenario?: (age: number, h: Household) => Scenario
}

/** The ages a sweep tries, the same range `retireAt` tries (its floor is the oldest person's age today). */
export function sweepAges(h: Household, a: Assumptions, options: SweepOptions = {}): number[] {
  const oldest = Math.max(0, ...h.persons.map((p) => a.today.year - p.birth.year))
  const from = Math.max(options.from ?? MIN_TRY_AGE, oldest)
  const to = Math.max(from, options.to ?? 70)
  const step = Math.max(1, Math.floor(options.step ?? 1))
  const ages: number[] = []
  for (let age = from; age <= to; age += step) ages.push(age)
  return ages
}

/** One variant, every age. */
export function sweepRow(h: Household, a: Assumptions, variant: Variant, options: SweepOptions = {}): SweepRow {
  const [hh, aa] = variant.apply(h, a)
  const build = options.scenario ?? ((age: number, x: Household) => everyoneAt(x, age))
  const cells = sweepAges(h, a, options).map((age): SweepCell => {
    const rows = project(hh, aa, build(age, hh))
    const bad = rows.find((r) => r.household.shortfall > 0)
    return {
      age,
      ok: !bad,
      firstShortfallYear: bad ? bad.year : null,
      netWorthAtHorizon: rows[rows.length - 1].household.netWorthEnd,
      lastYear: rows[rows.length - 1].year,
      lifetimeTax: rows.reduce((sum, r) => sum + r.household.tax, 0),
      shortfallTotal: rows.reduce((sum, r) => sum + r.household.shortfall, 0),
    }
  })
  return { id: variant.id, cells, earliestOk: cells.find((c) => c.ok)?.age ?? null }
}

/** Every variant, one row at a time: a worker posts each as it is done, so a slow grid fills in instead of waiting. */
export function* sweepRows(h: Household, a: Assumptions, variants: readonly Variant[], options: SweepOptions = {}): Generator<SweepRow> {
  for (const v of variants) yield sweepRow(h, a, v, options)
}

/** The whole grid. */
export function sweep(h: Household, a: Assumptions, variants: readonly Variant[], options: SweepOptions = {}): SweepRow[] {
  return [...sweepRows(h, a, variants, options)]
}
