import { everyoneAt, runScenario } from '../engine/retireAt.ts'
import type { Assumptions, Household } from '../engine/types.ts'

// The one sentence the results page leads with, and the facts behind it. It is built from two more projections around the
// answer — the earliest age that works, and the age one year before it — so « why this age and not the one before » can
// be said in a line: at the age before, money runs short in such a year.

export interface Headline {
  /** `now`: the age that works is one EVERYONE has already reached (retiring today works for the whole household); `at`: an
   *  age somebody has not reached yet (for a couple, the younger person's year is still ahead); `none`: no tried age works. */
  kind: 'now' | 'at' | 'none'
  /** The earliest age that works (null for `none`). */
  age: number | null
  /** The year the money first runs short if everyone retired one year earlier; null when that age is not tried or does not fail. */
  earlierShortfallYear: number | null
  /** The age before the answer, when it was tried (otherwise null). */
  earlierAge: number | null
  /** What is left at the horizon at the answer, in the year's dollars (null for `none`). */
  netWorthAtHorizon: number | null
}

/** `firstAge` is the lowest age tried; `youngest` is the age the YOUNGEST person has reached this year (the household can retire today only if everyone has reached the answer). */
export function headlineOf(household: Household, assumptions: Assumptions, earliest: number | null, firstAge: number, youngest: number): Headline {
  if (earliest === null) return { kind: 'none', age: null, earlierShortfallYear: null, earlierAge: null, netWorthAtHorizon: null }
  const at = runScenario(household, assumptions, everyoneAt(household, earliest), earliest)
  const earlierAge = earliest - 1 >= firstAge ? earliest - 1 : null
  const earlier = earlierAge === null ? null : runScenario(household, assumptions, everyoneAt(household, earlierAge), earlierAge)
  return {
    kind: earliest <= youngest ? 'now' : 'at',
    age: earliest,
    earlierShortfallYear: earlier && !earlier.ok ? earlier.firstShortfallYear : null,
    earlierAge: earlier ? earlierAge : null,
    netWorthAtHorizon: at.netWorthAtHorizon,
  }
}

/** The most the prudent scenario may differ from the answer before the headline mentions it: 3 years. */
export const PRUDENT_GAP_YEARS = 3

/** Does the prudent scenario give a clearly LATER age (or none at all) than the one the headline states? `undefined` = not worked out yet: no. */
export const prudentDiffers = (prudent: number | null | undefined, age: number | null): boolean =>
  prudent !== undefined && age !== null && (prudent === null || prudent - age >= PRUDENT_GAP_YEARS)
