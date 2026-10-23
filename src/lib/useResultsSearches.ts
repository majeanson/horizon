import { useMemo } from 'react'
import type { Assumptions, Household } from '../engine/types'
import { factsOf } from './facts'
import { useEarliestEach } from './useEarliestEach'
import { useFactImpact } from './useFactImpact'
import { useLevers } from './useLevers'
import { useMarketRange } from './useMarketRange'
import { usePresetRange } from './usePresetEarliest'
import type { Profile } from './schema'

// THE SEARCHES BEHIND THE RESULTS PAGE'S ANSWER, each off the page's thread (a worker per question): each person's own earliest age, the answer under the three scenarios, under a hard market, the
// levers that bring it forward, and the figures that would move it most. One third of what lib/useResultsPage.ts used to hold. They wait for the first answer to land (`answered`) so that on a
// two-core machine six searches do not race the one the page opens with; afterwards they re-ask alongside it, the last answer staying on screen meanwhile.

export function useResultsSearches(slow: Profile, slowAssumptions: Assumptions, answered: boolean, isCouple: boolean, retiredNow: boolean) {
  const household: Household = slow.household
  const earliestEachAnswer = useEarliestEach(household, slowAssumptions, answered && isCouple && !retiredNow)
  // The answer under each ready-made scenario, and the figure the sensitivity grids detail. ONE home for these three ages — nothing else restates them.
  const range = usePresetRange(household, slowAssumptions, answered)
  const stress = useMarketRange(household, slowAssumptions, answered)
  const levers = useLevers(household, slowAssumptions, answered)
  // The figures not yet read off a document, and how far the answer moves if each were off: idle work, after everything above it.
  const unconfirmed = useMemo(() => factsOf(slow).filter((f) => !f.confirmed).map((f) => ({ id: f.id, owner: f.owner, kind: f.kind })), [slow])
  // The heaviest searches of the page (two walks of projections for EVERY unconfirmed figure, one answer per kept plan) come LAST: on a two-core
  // machine they would otherwise run beside the range, the stress and the levers and slow the very figures the reader is waiting for.
  const firstSearchesIn = range !== undefined && stress !== undefined && levers !== undefined
  const impact = useFactImpact(household, slowAssumptions, unconfirmed, answered && firstSearchesIn && !retiredNow)
  return { earliestEachAnswer, range, stress, levers, unconfirmed, firstSearchesIn, impact }
}
