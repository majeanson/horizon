import { retirementState } from '../engine/ledger.ts'
import type { AnswerRequest } from './answer.ts'
import { MAX_AGE, MIN_AGE, assumptionsOf } from './resultsModel.ts'
import type { Profile } from './schema.ts'

// THE QUESTION the answer worker is asked, worked out from a profile. The results page, the live answer pinned above Profil and
// Hypothèses (and any card that wants the answer of a household it does not own) all ask `useAnswer` the same question; the
// ages and the « everybody has stopped » flag used to be derived twice, by hand, and are now derived here, once. Pure: the clock
// is an input (`now`), as everywhere the app meets the engine — pass `today()` from a component, a fixed month from a test.
export function answerRequest(profile: Profile, now: { year: number; month: number }): AnswerRequest {
  const assumptions = assumptionsOf(profile, now)
  const ages = profile.household.persons.map((p) => now.year - p.birth.year)
  return {
    household: profile.household,
    assumptions,
    // Clamped on BOTH sides: someone past 70 and still working used to leave firstAge above MAX_AGE —
    // an empty compare rail and an age box whose min sat over its max.
    firstAge: Math.min(MAX_AGE, Math.max(MIN_AGE, Math.max(...ages))),
    youngest: Math.min(...ages),
    everyoneRetired: retirementState(profile.household, assumptions).everyoneRetired,
  }
}
