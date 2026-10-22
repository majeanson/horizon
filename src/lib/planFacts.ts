import { leverRanking, type LeverId } from '../engine/levers.ts'
import { DEATH_AGES, sweepAges } from '../engine/deathSweep.ts'
import { project } from '../engine/projection.ts'
import { retireAt } from '../engine/retireAt.ts'
import type { Assumptions, Household, PersonId, YearRow } from '../engine/types.ts'
import { computeAnswer } from './answer.ts'
import { answerRequest } from './answerRequest.ts'
import type { Profile } from './schema.ts'

// THE FACTS A SENTENCE MAY STATE. The plain-language texts (exampleStory.ts, whatIfCopy.ts) never type a figure and never decide what is true: they hold templates with
// tokens, and the variant of a sentence is picked from the facts below. Every fact is worked out by the same functions the results page uses (`computeAnswer`, `leverRanking`,
// `project`), in ONE money basis — today's dollars, rounded to the thousand — so a text cannot disagree with the page, and cannot mix dollars of different years.
// Pure: the clock is an input (`now`), a profile in and plain data out, so it works for the household on this device as it does for an example.

/** Today's dollars at the end of the plan, rounded to the thousand. */
const realThousand = (rows: readonly YearRow[], a: Assumptions): number => {
  const last = rows[rows.length - 1]
  return Math.round(last.household.netWorthEnd / (1 + a.inflation) ** (last.year - a.today.year) / 1000) * 1000
}

const shortfallYear = (rows: readonly YearRow[]): number | null => rows.find((r) => r.household.shortfall > 0)?.year ?? null

export interface LeverFact {
  id: LeverId
  /** Years earlier the earliest age moves (negative: later); null when either side has no age that works. */
  yearsGained: number | null
  /** What the change adds to the money left at the end of the plan, today's dollars (negative: less); null without a base age. */
  endGain: number | null
}

export interface PlanFacts {
  /** The headline's kind: `now` (everyone has already reached the earliest age that works), `at`, or `none` (no age up to the search's end works). */
  kind: 'now' | 'at' | 'none'
  /** The earliest age at which everyone retiring together keeps the money lasting; null for `none`. */
  earliest: number | null
  /** Everybody has already stopped working: the question is whether the money lasts, not when. */
  everyoneRetired: boolean
  /** The plan as the household entered it (each at their own retirement age): does the money last? */
  ownPlanHolds: boolean
  /** The first year the money runs short in that plan; null when it holds. */
  firstShortfallYear: number | null
  /** What is left at the end of that plan, today's dollars, rounded to the thousand. */
  nestEnd: number
  /** The most the answer's age can fund each year in retirement, today's dollars; null when even nothing works, undefined without an age. */
  comfort: number | null | undefined
  levers: LeverFact[]
}

export function planFacts(profile: Profile, now: { year: number; month: number }): PlanFacts {
  const req = answerRequest(profile, now)
  const answer = computeAnswer(req)
  const rows = project(structuredClone(req.household), structuredClone(req.assumptions))
  const short = shortfallYear(rows)
  return {
    kind: answer.headline.kind,
    earliest: answer.headline.age,
    everyoneRetired: req.everyoneRetired,
    ownPlanHolds: short === null,
    firstShortfallYear: short,
    nestEnd: realThousand(rows, req.assumptions),
    comfort: answer.comfort,
    levers: leverRanking(req.household, req.assumptions).levers.map((l) => ({
      id: l.id,
      yearsGained: l.yearsGained,
      endGain: l.endGain === null ? null : Math.round(l.endGain / 1000) * 1000,
    })),
  }
}

/** What the page asks the worker for: a profile and the clock. The same content is the same answer, so a reopened card is answered from what was kept. */
export interface PlanFactsRequest {
  profile: Profile
  today: { year: number; month: number }
}

export interface PlanFactsResult {
  facts: PlanFacts
  whatIf: WhatIfFacts
}

/** Both sets of facts of a profile in one job (some seventy projections): run by `planFacts.worker.ts` off the page's thread, and by `usePlanFacts` on it only where a worker cannot be made. */
export function planFactsOf({ profile, today }: PlanFactsRequest): PlanFactsResult {
  return { facts: planFacts(profile, today), whatIf: whatIfFacts(profile, today) }
}

export interface WhatIfFacts {
  /** A crash in the first years of retirement (the « bad start » market path) against the markets as the household assumed. */
  crash: { earliest: number | null; base: number | null; ownPlanHolds: boolean; nestEnd: number }
  /** One of a couple dying earlier (the first person, at the age the death sweep offers nearest 75); null for a household of one, or when no age fits. */
  death: { who: PersonId; age: number; ownPlanHolds: boolean; nestEnd: number; nestEndBase: number } | null
}

export function whatIfFacts(profile: Profile, now: { year: number; month: number }): WhatIfFacts {
  const req = answerRequest(profile, now)
  const { household: h, assumptions: a } = req
  const earliestOf = (hh: Household, aa: Assumptions) => retireAt(structuredClone(hh), structuredClone(aa), { stopAtFirstOk: true }).earliestOk
  const run = (hh: Household, aa: Assumptions) => project(structuredClone(hh), structuredClone(aa))

  const baseRows = run(h, a)
  const bad: Assumptions = { ...a, marketPath: { preset: 'badStart', custom: [] } }
  const badRows = run(h, bad)
  const crash = { earliest: earliestOf(h, bad), base: earliestOf(h, a), ownPlanHolds: shortfallYear(badRows) === null, nestEnd: realThousand(badRows, bad) }

  let death: WhatIfFacts['death'] = null
  if (h.persons.length === 2) {
    const who = h.persons[0].id
    const ages = sweepAges(h, a, who, DEATH_AGES)
    if (ages.length > 0) {
      const age = ages.reduce((best, x) => (Math.abs(x - 75) < Math.abs(best - 75) ? x : best), ages[0])
      const dying: Household = { ...h, persons: h.persons.map((p) => (p.id === who ? { ...p, horizonAge: age } : p)) }
      const rows = run(dying, a)
      death = { who, age, ownPlanHolds: shortfallYear(rows) === null, nestEnd: realThousand(rows, a), nestEndBase: realThousand(baseRows, a) }
    }
  }
  return { crash, death }
}
