import { withPreset } from '../engine/assumptionPresets.ts'
import { planGlance, type PlanGlance } from '../engine/ledger.ts'
import { maxRetiredSpending } from '../engine/maxSpending.ts'
import { retireAt, worksNow } from '../engine/retireAt.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import { headlineOf, type Headline } from './headline.ts'
import { stopWorking, type StopWorking } from './stopWorking.ts'

// THE answer of the results page, as one job: the earliest age that works (a search of a dozen full projections), whether
// stopping today works, the headline built around that age, what it can fund each month (a binary search of a dozen more)
// and the age put in dates — or, for a household that has already stopped working, whether the money lasts, under its own
// scenario and under Prudent. Some forty projections — run by `answer.worker.ts` off the page's thread, and by `useAnswer`
// on it only where a worker cannot be made. One function so the two can never disagree.

export interface AnswerRequest {
  household: Household
  assumptions: Assumptions
  /** The lowest age tried (the oldest person's age today, clamped to the page's range). */
  firstAge: number
  /** The age the youngest person has reached this year. */
  youngest: number
  /** Everybody has already stopped working: « when? » is answered, what is left to say is whether the money lasts. */
  everyoneRetired: boolean
}

export interface AnswerResult {
  earliest: number | null
  nowOk: boolean
  headline: Headline
  /** Retired spending the answer's age can fund, per year, today's dollars; null when even 0 fails; undefined without an age. */
  comfort: number | null | undefined
  stop: StopWorking | null
  /** The retired household's plan at a glance, under its own scenario and under Prudent; null unless everyone is retired. */
  glance: { now: PlanGlance; prudent: PlanGlance } | null
}

/** The headline when nothing has been worked out (the profile has gaps, or the answer is not in yet). */
export const NO_HEADLINE: Headline = { kind: 'none', age: null, earlierShortfallYear: null, earlierAge: null, netWorthAtHorizon: null }

export function computeAnswer({ household, assumptions, firstAge, youngest, everyoneRetired }: AnswerRequest): AnswerResult {
  const earliest = retireAt(household, assumptions, { stopAtFirstOk: true }).earliestOk
  // « Dès maintenant »: the earliest age found is only the first one tried (the oldest person's age today) and stopping today works.
  const nowOk = worksNow(household, assumptions, earliest)
  const headline = headlineOf(household, assumptions, earliest, firstAge, youngest, nowOk)
  const comfort = headline.age === null ? undefined : maxRetiredSpending(household, assumptions, headline.age)
  const stop = headline.age === null ? null : stopWorking(household, assumptions, headline.age)
  const glance = everyoneRetired ? { now: planGlance(household, assumptions), prudent: planGlance(household, withPreset(assumptions, 'prudent')) } : null
  return { earliest, nowOk, headline, comfort, stop, glance }
}
