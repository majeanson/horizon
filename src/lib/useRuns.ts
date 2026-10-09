import { runSelections, type Selection } from './resultsModel.ts'
import type { RunsMessage, RunsRequest } from './runs.worker.ts'
import type { Profile } from './schema.ts'
import { useOffThread } from './useOffThread.ts'

// The comparisons (lib/resultsModel.ts `runSelections`), off the page's thread: `value` is null until the first ones are
// in (the cards, the chart and the tables show a skeleton), then always the LAST ones — a chosen age added, a slider
// released — flagged `busy` until the new ones land.
export function useRuns(profile: Profile, today: { year: number; month: number }, selections: readonly Selection[], enabled: boolean): { value: RunsMessage | null; busy: boolean } {
  const request: RunsRequest = { profile, today, selections }
  return useOffThread<RunsRequest, RunsMessage, RunsMessage>(
    request,
    () => new Worker(new URL('./runs.worker.ts', import.meta.url), { type: 'module' }),
    () => runSelections(profile, today, selections),
    (m) => m,
    enabled,
  )
}
