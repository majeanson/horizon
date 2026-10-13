import { fillCeiling } from './bracketFill.ts'
import { paramsFor } from './params/index.ts'
import { MIN_TRY_AGE, retireAt, runScenario } from './retireAt.ts'
import type { Assumptions, BracketFill, Household } from './types.ts'

// « Up to which line should the RRSP be drawn? » — THE HOUSEHOLD'S OWN PLAN (each person retiring at their own age, as in the profile — not the earliest age that works, which can be
// decades before the life the person actually plans, with nothing left to melt) run once with no filling and once per ceiling
// (engine/bracketFill.ts), so a household can see what the habit is worth. Nothing new is modelled: each way is the
// projection's own `bracketFill`, with every withdrawal still solved against the tax function year by year.
//
// What it says is the point of the habit, not a wealth ranking: the tax paid over the plan, the largest forced RRIF minimum
// (a big RRSP left late is taxed hard and pushes pensions over the OAS line), and what is LEFT in the RRSP (taxed as income at
// death) against what is left in the TFSA (not taxed). The ranking leads with whether the plan holds, then the lifetime tax; the earliest
// age that works is shown beside them, not ranked on.

export type FillChoice = BracketFill | null
export const FILL_CHOICES: readonly FillChoice[] = [null, 'bracket1', 'oas']

export interface FillYear {
  year: number
  /** The first person's age (the one the page speaks about). */
  age: number
  /** The household's net income, per person, highest of the two in a couple — the line the ceiling is read against. */
  income: number
  /** The ceiling of this way in this year (null for « no filling »), the same dollars as `income`. */
  ceiling: number | null
  /** RRSP drawn in the year, including the forced minimum. */
  rrspDrawn: number
  /** The forced RRIF minimum inside it. */
  minimum: number
  rrsp: number
  tfsa: number
  /** Income tax and OAS recovery of the year. */
  tax: number
  /** The GIS the household receives in the year (melting stops while it is paid: the GIS is lost faster than the tax is saved). */
  gis: number
}

export interface FillOutcome {
  choice: FillChoice
  /** The earliest whole age at which everyone can stop and the plan lasts with THIS way of drawing, or null. */
  earliestOk: number | null
  ok: boolean
  firstShortfallYear: number | null
  /** Income tax and OAS recovery, summed over the plan, in today's dollars. */
  lifetimeTax: number
  /** The OAS recovery tax alone, summed, today's dollars. */
  recoveryTotal: number
  /** The largest RRIF minimum forced in one year, today's dollars. */
  peakMinimum: number
  /** What is left at the horizon, today's dollars: the RRSP (taxed as income at death) and the TFSA (not taxed). */
  rrspLeft: number
  tfsaLeft: number
  years: FillYear[]
}

export interface FillComparison {
  /** The first person's own retirement age: the plan every outcome was read at (each person retires at THEIR age, as in the profile). */
  age: number
  /** The first calendar year anyone is retired: the years before it are work, where nothing is melted. */
  retiredFrom: number
  outcomes: FillOutcome[]
  /** Index of the household's own choice. */
  current: number
  /** Index of the way that comes out ahead — the household's own when nothing beats it by a margin. */
  best: number
}

/**
 * Is way `x` clearly ahead of way `y`? A way that keeps the household's own plan going comes first; then the lower lifetime tax. The earliest age that works is shown, not ranked on:
 * a year more or less at an age the household does not plan is no reason to pay 15 % more tax on the life it does. Less than 1 % of the tax (or 500 $) is noise, not a reason to change
 * the household's habit.
 */
export function fillAhead(x: Pick<FillOutcome, 'ok' | 'lifetimeTax'>, y: Pick<FillOutcome, 'ok' | 'lifetimeTax'>): boolean {
  if (x.ok !== y.ok) return x.ok
  return x.lifetimeTax < y.lifetimeTax - Math.max(500, 0.01 * y.lifetimeTax)
}

export function fillComparison(h: Household, a: Assumptions, firstAge = MIN_TRY_AGE, lastAge = 70): FillComparison {
  const age = h.persons[0].retirementAge
  const retiredFrom = Math.min(...h.persons.map((p) => p.birth.year + p.retirementAge))
  const real = (year: number) => Math.pow(1 + a.inflation, year - a.today.year)
  const lead = h.persons[0].id
  const outcomes: FillOutcome[] = FILL_CHOICES.map((choice) => {
    const withFill: Assumptions = { ...a, bracketFill: choice }
    const earliestOk = retireAt(h, withFill, { from: firstAge, to: lastAge, stopAtFirstOk: true }).earliestOk
    const run = runScenario(h, withFill, {}, age)
    let lifetimeTax = 0
    let recoveryTotal = 0
    let peakMinimum = 0
    const years: FillYear[] = run.rows.map((row) => {
      const f = real(row.year)
      const people = Object.values(row.persons)
      const tax = row.household.tax / f
      lifetimeTax += tax
      recoveryTotal += people.reduce((s, p) => s + (p?.oasRecovery ?? 0), 0) / f
      const minimum = people.reduce((s, p) => s + (p?.rrifMinimum ?? 0), 0) / f
      peakMinimum = Math.max(peakMinimum, minimum)
      return {
        year: row.year,
        age: row.persons[lead]?.age ?? 0,
        income: Math.max(...people.map((p) => p?.netIncome ?? 0)) / f,
        ceiling: choice === null ? null : fillCeiling(choice, paramsFor(row.year, { inflation: a.inflation, wageGrowth: a.wageGrowth })) / f,
        rrspDrawn: people.reduce((s, p) => s + (p ? p.withdrawals.rrsp + p.rrifMinimum : 0), 0) / f,
        minimum,
        rrsp: people.reduce((s, p) => s + (p?.balancesEnd.rrsp ?? 0), 0) / f,
        tfsa: people.reduce((s, p) => s + (p?.balancesEnd.tfsa ?? 0), 0) / f,
        tax,
        gis: people.reduce((s, p) => s + (p?.gis ?? 0), 0) / f,
      }
    })
    const last = years[years.length - 1]
    return { choice, earliestOk, ok: run.ok, firstShortfallYear: run.firstShortfallYear, lifetimeTax, recoveryTotal, peakMinimum, rrspLeft: last?.rrsp ?? 0, tfsaLeft: last?.tfsa ?? 0, years }
  })
  let current = outcomes.findIndex((o) => o.choice === (a.bracketFill ?? null))
  if (current < 0) current = 0
  let best = current
  outcomes.forEach((o, i) => {
    if (fillAhead(o, outcomes[best])) best = i
  })
  return { age, retiredFrom, outcomes, current, best }
}
