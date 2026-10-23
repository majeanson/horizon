import { useRef } from 'react'
import { runSelections, type Selection } from './resultsModel.ts'
import type { RunsMessage, RunsRequest } from './runs.job.ts'
import type { Profile } from './schema.ts'
import { useOffThread } from './useOffThread.ts'
import { engineWorker } from './engineWorker.ts'

// The comparisons (lib/resultsModel.ts `runSelections`), off the page's thread: `value` is null until the first ones are
// in (the cards, the chart and the tables show a skeleton), then always the LAST ones — a chosen age added, a slider
// released — flagged `busy` until the new ones land.
//
// `basis` is the profile those runs were PROJECTED from — this request's once it is answered, the earlier one while a new one is worked out. A figure read
// off the runs (deflated to today's dollars, a retirement marked on the chart) must use its assumptions and its household: the live profile's inflation
// applied to rows projected under another made the « today's dollars » of the cards match neither plan until the worker answered.
export function useRuns(profile: Profile, today: { year: number; month: number }, selections: readonly Selection[], enabled: boolean): { value: RunsMessage | null; busy: boolean; basis: Profile | null } {
  const request: RunsRequest = { profile, today, selections }
  const answer = useOffThread<RunsRequest, RunsMessage, RunsMessage>(
    request,
    () => engineWorker('runs'),
    () => runSelections(profile, today, selections),
    (m) => m,
    enabled,
  )
  // The held answer is THIS request's when it is not busy: remember which profile that was, for as long as the answer is shown (idempotent per render).
  const basis = useRef<Profile | null>(null)
  if (answer.value !== null && !answer.busy) basis.current = profile
  return { ...answer, basis: answer.value === null ? null : (basis.current ?? profile) }
}
