import { project } from './projection.ts'
import type { AgeResult, Assumptions, Household, PersonId, RetireAtResult, Scenario, YearRow } from './types.ts'

// « When can we retire? » — the projection run once per candidate retirement age.
//
// A candidate age WORKS when no year of the plan has a shortfall: every year's spending is met, to the
// horizon age of the youngest person. That is a deliberately plain definition — it says nothing about how
// comfortable the end is, which is what the net worth at the horizon is shown for.

/** The youngest retirement age anyone is asked about: the age of majority, so any adult can check their own case. */
export const MIN_TRY_AGE = 18

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
  /** The youngest age to try (default 18, the age of majority — so anyone can check). Never below an age someone has already passed. */
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
  const from = Math.max(options.from ?? MIN_TRY_AGE, oldest)
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

/** Stopping TODAY: every person at the age they have reached this year (nobody can retire in the past). */
export const nowScenario = (h: Household, a: Assumptions): Scenario => ({
  retirementAge: Object.fromEntries(h.persons.map((p) => [p.id, ageThisYear(h, a, p.id)])),
})

/**
 * Is the earliest age `earliest` the FLOOR of the search — the age the oldest person has already reached — and does stopping
 * today (each at their own age) work? Then the honest answer is « dès maintenant », not « dès 50 ans »: 50 was only the first
 * age tried (the older person is 50 today), not a minimum anyone has to wait for.
 */
export function worksNow(h: Household, a: Assumptions, earliest: number | null): boolean {
  if (earliest === null) return false
  const oldest = Math.max(0, ...h.persons.map((p) => ageThisYear(h, a, p.id)))
  if (earliest !== Math.max(MIN_TRY_AGE, oldest)) return false
  return runScenario(h, a, nowScenario(h, a), oldest).ok
}

/** Side by side: the named scenarios, each run in full — the data of the « 60 vs 65 » chart. */
export function compare(
  h: Household,
  a: Assumptions,
  scenarios: readonly { label: string; scenario: Scenario; age: number }[],
): { label: string; result: AgeResult }[] {
  return scenarios.map((s) => ({ label: s.label, result: runScenario(h, a, s.scenario, s.age) }))
}

/** One person's own answer in a couple: the earliest age THEY can retire, the other holding at `heldAt`. */
export interface EarliestEach {
  id: PersonId
  /** The earliest whole age at which this person can retire so no year has a shortfall, or null when none up to `to` works. */
  earliestOk: number | null
  /** The person who keeps working (or not) at a fixed age while this one's age is tried, and that age. */
  other: { id: PersonId; heldAt: number } | null
}

export interface EarliestEachOptions {
  /** The age each person is held at while the OTHER one's age is tried (default: the age in the profile). */
  heldAt?: Partial<Record<PersonId, number>>
  from?: number
  to?: number
}

/**
 * « When can EACH of us retire? » — for every person, the earliest age they can retire with the other held at a
 * stated age (by default the one in the profile), instead of everyone retiring together at the tried age.
 *
 * It is the one-question-at-a-time reading of a two-person plan: the answer for A says « if B does what the plan
 * says, A can stop at X », and the answer for B says the converse. The two answers are NOT a joint plan (A at X and
 * B at Y together may fail: both stopping early removes two incomes) — the joint check is the « Chacun son âge »
 * comparison. A person's own range starts at their own current age (nobody retires in the past), not the oldest's.
 * A household of one gets the plain `earliestOk`, with no `other`.
 */
export function earliestEach(h: Household, a: Assumptions, options: EarliestEachOptions = {}): EarliestEach[] {
  return h.persons.map((p) => {
    const other = h.persons.length === 2 ? h.persons.find((q) => q.id !== p.id)! : null
    const heldAt = other ? (options.heldAt?.[other.id] ?? other.retirementAge) : 0
    const from = Math.max(options.from ?? MIN_TRY_AGE, ageThisYear(h, a, p.id))
    const to = Math.max(from, options.to ?? 70)
    const scenario = (age: number): Scenario => ({ retirementAge: { ...(other ? { [other.id]: heldAt } : {}), [p.id]: age } })
    // Not `retireAt`: it never tries an age below the OLDEST person's, and here each person's range starts at their own.
    let earliestOk: number | null = null
    for (let age = from; age <= to; age++) {
      if (runScenario(h, a, scenario(age), age).ok) {
        earliestOk = age
        break
      }
    }
    return { id: p.id, earliestOk, other: other ? { id: other.id, heldAt } : null }
  })
}
