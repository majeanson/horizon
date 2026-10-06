import { project } from './projection.ts'
import type { AgeResult, Assumptions, Household, PersonId, RetireAtResult, Scenario, YearRow } from './types.ts'

// « When can we retire? » — the projection run once per candidate retirement age.
//
// A candidate age WORKS when no year of the plan has a shortfall: every year's spending is met, to the
// horizon age of the youngest person. That is a deliberately plain definition — it says nothing about how
// comfortable the end is, which is what the net worth at the horizon is shown for.

const lastRow = (rows: readonly YearRow[]): YearRow => rows[rows.length - 1]

/** The household's own age: the age a person reaches this calendar year. */
const ageThisYear = (h: Household, a: Assumptions, id: PersonId): number => {
  const p = h.persons.find((x) => x.id === id)
  return p ? a.today.year - p.birth.year : 0
}

/** Everyone retires at `age` — the default question. */
export const everyoneAt = (h: Household, age: number): Scenario => ({
  retirementAge: Object.fromEntries(h.persons.map((p) => [p.id, age])),
})

/** Run one scenario and read its verdict. */
export function runScenario(h: Household, a: Assumptions, scenario: Scenario, age: number): AgeResult {
  const rows = project(h, a, scenario)
  const bad = rows.find((r) => r.household.shortfall > 0)
  return { age, ok: !bad, firstShortfallYear: bad ? bad.year : null, netWorthAtHorizon: lastRow(rows).household.netWorthEnd, rows }
}

export interface RetireAtOptions {
  /** The youngest age to try (default 50). Never below an age someone has already passed. */
  from?: number
  /** The oldest age to try (default 70). */
  to?: number
  /** How a tried age becomes a scenario (default: everyone retires at that age, every other choice as in the profile). */
  scenario?: (age: number) => Scenario
  /** Stop at the first age that works: the cheap way to ask only for `earliestOk` (`byAge` then ends there). */
  stopAtFirstOk?: boolean
}

/**
 * Try every whole retirement age from `from` to `to`. The earliest age that works is `earliestOk`; ages below
 * what anyone has already lived are skipped, since nobody can retire in the past.
 */
export function retireAt(h: Household, a: Assumptions, options: RetireAtOptions = {}): RetireAtResult {
  const oldest = Math.max(0, ...h.persons.map((p) => ageThisYear(h, a, p.id)))
  const from = Math.max(options.from ?? 50, oldest)
  const to = Math.max(from, options.to ?? 70)
  const build = options.scenario ?? ((age: number) => everyoneAt(h, age))
  const byAge: AgeResult[] = []
  for (let age = from; age <= to; age++) {
    const result = runScenario(h, a, build(age), age)
    byAge.push(result)
    if (result.ok && options.stopAtFirstOk) break
  }
  return { byAge, earliestOk: byAge.find((r) => r.ok)?.age ?? null }
}

/** Side by side: the named scenarios, each run in full — the data of the « 60 vs 65 » chart. */
export function compare(
  h: Household,
  a: Assumptions,
  scenarios: readonly { label: string; scenario: Scenario; age: number }[],
): { label: string; result: AgeResult }[] {
  return scenarios.map((s) => ({ label: s.label, result: runScenario(h, a, s.scenario, s.age) }))
}
