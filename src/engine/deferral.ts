import { oasStart } from './oas.ts'
import { paramsFor } from './params/index.ts'
import { project } from './projection.ts'
import { everyoneAt, retireAt } from './retireAt.ts'
import { ampe5, rrqStart, type YearMonth } from './rrq.ts'
import { makeRrqRules } from './rrqRules.ts'
import type { Assumptions, Household, PersonId, Scenario, YearRow } from './types.ts'

// « When should I START my pension? » — the same household run once per start age, one lever at a time.
//
// Each person's QPP (RRQ) and OAS can start earlier or later than 65: the QPP from 60 (reduced) to 72 (+58.8 %), the
// OAS from 65 to 70 (+36 %). Both are paid for life and indexed to prices, so a later start buys a larger pension in
// every year that follows and costs the years it was not paid. This module puts numbers on that trade for the
// household in front of it, from the same projection the verdict uses (so a figure here is a figure there):
//   · the pension per month, in today's dollars, against starting at 65;
//   · the age at which the choice has paid for itself (the « break-even »): cumulative pension received, in real
//     dollars and before tax, caught up with starting at 65 — or, for a start before 65, the age at which waiting
//     until 65 overtakes it;
//   · the effect on the plan: whether the money lasts, the earliest retirement age that works, and the net worth,
//     in today's dollars, when the person turns 85 and 95.
//
// What it does NOT say: it assumes a life as long as the plan's horizon (a break-even is a longevity bet, which is the
// point), it counts the pension before tax and without the GIS (deferring the OAS defers the GIS that goes with it),
// and it does not model a survivor's pension. The page says so beside the numbers.

/** The QPP and OAS start ages compared. The OAS cannot start before 65 nor after 70; the QPP between 60 and 72. */
export const RRQ_START_AGES = [60, 65, 70, 72] as const
export const OAS_START_AGES = [65, 70] as const

export interface StartOption {
  /** The age the pension starts. */
  age: number
  /** The pension per month, in today's dollars (a pension indexed to prices keeps its buying power). */
  monthly: number
  /** Against starting at 65 by the rule alone (see `startLevel`), as a fraction: 0.42 is 42 % more, −0.36 is 36 % less; 0 at 65. */
  versus65: number
  /** The change in the monthly amount actually shown (`monthly`, today's dollars) against starting at 65: for the QPP it differs from `versus65` because a later start is calculated on higher wages (the economy's part). */
  change: number
  /**
   * For a start after 65: the age (reached in that year) at which the cumulative pension, in today's dollars and before
   * tax, has caught up with starting at 65. For a start before 65: the age at which starting at 65 has caught up with
   * starting early. `null` at 65, when the pension is nil, or when it does not happen before the plan's horizon.
   */
  breakEven: number | null
  /**
   * True when this start age is already behind the person (the pension would have begun in an earlier year than today's):
   * it can no longer be chosen. The figures are still the rule's own — what it would have paid — and the payments already
   * made are counted in the break-even, so a late start is compared with what starting at 65 really paid.
   */
  passed: boolean
  /** The household's plan when only this start age changes (everything else as in the profile). */
  plan: {
    ok: boolean
    firstShortfallYear: number | null
    /** The household's net worth in the year the person turns 85 / 95, in today's dollars; null past the plan's horizon. */
    netWorth85: number | null
    netWorth95: number | null
    /** The earliest age at which everyone can retire so the money lasts, with this start age; null if none up to 70 does. */
    earliestOk: number | null
  }
}

export interface PersonDeferral {
  id: PersonId
  /** The start ages the profile uses now (so the page can say « your plan »). */
  current: { rrq: number; oas: number }
  rrq: StartOption[]
  oas: StartOption[]
}

export interface DeferralFacts {
  /** What each month of waiting after 65 adds: the QPP's 0.007 and the OAS's 0.006. */
  rrqPerMonth: number
  oasPerMonth: number
  /** The most the QPP grows by waiting, from 65: 0.588 at 72. */
  rrqLateMax: number
  /** The most the OAS grows by waiting, from 65: 0.36 at 70. */
  oasLateMax: number
}

export interface DeferralView {
  persons: PersonDeferral[]
  facts: DeferralFacts
}

type Kind = 'rrq' | 'oas'

const inflator = (a: Assumptions) => (year: number) => (1 + a.inflation) ** (year - a.today.year)

/** One person's pension for each year, nominal, from a projection. */
const annual = (rows: readonly YearRow[], id: PersonId, kind: Kind): { year: number; amount: number }[] =>
  rows.map((r) => ({ year: r.year, amount: r.persons[id]?.[kind] ?? 0 }))

/** The row of the first FULL calendar year of a pension that began in `startYear`: today's own row when it began earlier (that year is whole), else the year after the start (the start year is partial). A plan that ends within a year of the start falls back to the first paying row. */
function fullRow(years: readonly { year: number; amount: number }[], startYear: number): { year: number; amount: number } | null {
  const first = years.findIndex((y) => y.amount > 0)
  if (first < 0) return null
  if (startYear < years[0].year) return years[0]
  return years[first + 1] ?? years[first]
}

/**
 * The monthly pension in today's dollars: the first FULL calendar year after the pension began (today's, for one that
 * began earlier), over 12, deflated to today (a pension indexed to prices keeps its real amount).
 */
function monthlyToday(rows: readonly YearRow[], id: PersonId, kind: Kind, deflate: (year: number) => number, startYear: number): number {
  const full = fullRow(annual(rows, id, kind), startYear)
  return full ? full.amount / 12 / deflate(full.year) : 0
}

/**
 * The pension the start age earned by the rule alone, comparable across start ages: the monthly amount in the dollars
 * of the year the pension began — divided, for the QPP, by the growth of the average ceiling (AMPE5, the same one the
 * calculation uses: observed to 2026, then moved by wage growth) between today and that year, because the QPP is
 * calculated on earnings revalued up to the start (a later start is calculated on a later, higher index: that part is
 * the economy, not the choice); for the OAS, by prices. Divided by this, 70 against 65 is the rule's +42 %, not +49 % —
 * and it stays the rule's figure for a person whose 65 is already behind them (the start year, not today, is the base).
 */
function startLevel(rows: readonly YearRow[], id: PersonId, kind: Kind, a: Assumptions, startYear: number, ampe: (year: number) => number): number {
  const full = fullRow(annual(rows, id, kind), startYear)
  if (!full) return 0
  const atStart = full.amount / 12 / (1 + a.inflation) ** (full.year - startYear)
  return kind === 'rrq' ? atStart / (ampe(startYear) / ampe(a.today.year)) : atStart / (1 + a.inflation) ** (startYear - a.today.year)
}

/** The payments already made before this year's January, in today's dollars: a pension that began earlier paid them, the projection (which starts today) does not show them. */
function missedPayments(start: YearMonth, monthlyReal: number, today: { year: number }): number {
  const months = (today.year - start.year) * 12 - (start.month - 1)
  return months > 0 ? months * monthlyReal : 0
}

/** Cumulative pension received up to and including each year, in today's dollars — `offset` is what was received before the projection began. */
function cumulative(rows: readonly YearRow[], id: PersonId, kind: Kind, deflate: (year: number) => number, offset: number): Map<number, number> {
  const out = new Map<number, number>()
  let sum = offset
  for (const y of annual(rows, id, kind)) {
    sum += y.amount / deflate(y.year)
    out.set(y.year, sum)
  }
  return out
}

function breakEven(option: Map<number, number>, baseline: Map<number, number>, startAge: number, birthYear: number): number | null {
  if (startAge === 65) return null
  const later = startAge > 65
  for (const [year, sum] of option) {
    const other = baseline.get(year) ?? 0
    if (sum === 0 && other === 0) continue
    if (later ? sum >= other && sum > 0 : other >= sum && other > 0) return year - birthYear
  }
  return null
}

const scenarioFor = (id: PersonId, kind: Kind, age: number): Scenario => (kind === 'rrq' ? { rrqStartAge: { [id]: age } } : { oasStartAge: { [id]: age } })

/** The deferral comparison for every person in the household. Seconds of arithmetic for a couple: run it off the page's thread. */
export function deferralView(h: Household, a: Assumptions): DeferralView {
  const deflate = inflator(a)
  const rules = makeRrqRules({ inflation: a.inflation, wageGrowth: a.wageGrowth })
  const ampe = (year: number) => ampe5(year, rules)
  const netWorthAt = (rows: readonly YearRow[], birthYear: number, age: number): number | null => {
    const row = rows.find((r) => r.year === birthYear + age)
    return row ? row.household.netWorthEnd / deflate(row.year) : null
  }

  const persons = h.persons.map((p): PersonDeferral => {
    const optionsOf = (kind: Kind, ages: readonly number[]): StartOption[] => {
      const runs = new Map(ages.map((age) => [age, project(h, a, scenarioFor(p.id, kind, age))]))
      const startOf = (age: number): YearMonth => (kind === 'rrq' ? rrqStart(p.birth, age) : oasStart(p.birth, age))
      const baselineRows = runs.get(65)!
      const baselineStart = startOf(65)
      const baselineMonthly = monthlyToday(baselineRows, p.id, kind, deflate, baselineStart.year)
      const baselineLevel = startLevel(baselineRows, p.id, kind, a, baselineStart.year, ampe)
      const baselineCum = cumulative(baselineRows, p.id, kind, deflate, missedPayments(baselineStart, baselineMonthly, a.today))
      return ages.map((age) => {
        const rows = runs.get(age)!
        const start = startOf(age)
        const monthly = monthlyToday(rows, p.id, kind, deflate, start.year)
        const bad = rows.find((r) => r.household.shortfall > 0)
        const earliest = retireAt(h, a, { stopAtFirstOk: true, scenario: (retire) => ({ ...everyoneAt(h, retire), ...scenarioFor(p.id, kind, age) }) }).earliestOk
        return {
          age,
          monthly,
          change: baselineMonthly > 0 ? monthly / baselineMonthly - 1 : 0,
          versus65: baselineLevel > 0 ? startLevel(rows, p.id, kind, a, start.year, ampe) / baselineLevel - 1 : 0,
          breakEven: breakEven(cumulative(rows, p.id, kind, deflate, missedPayments(start, monthly, a.today)), baselineCum, age, p.birth.year),
          passed: start.year < a.today.year,
          plan: { ok: !bad, firstShortfallYear: bad ? bad.year : null, netWorth85: netWorthAt(rows, p.birth.year, 85), netWorth95: netWorthAt(rows, p.birth.year, 95), earliestOk: earliest },
        }
      })
    }
    return { id: p.id, current: { rrq: p.rrq.startAge, oas: p.oas.startAge }, rrq: optionsOf('rrq', RRQ_START_AGES), oas: optionsOf('oas', OAS_START_AGES) }
  })

  const P = paramsFor(a.today.year, { inflation: a.inflation, wageGrowth: a.wageGrowth })
  return { persons, facts: { rrqPerMonth: P.rrq.latePerMonth, oasPerMonth: P.oas.deferralPerMonth, rrqLateMax: P.rrq.latePerMonth * P.rrq.lateMaxMonths, oasLateMax: P.oas.deferralPerMonth * P.oas.deferralMaxMonths } }
}
