import { runSelections, type Selection } from './resultsModel.ts'
import type { Profile } from './schema.ts'

// The comparisons of the results page — one full projection per chosen age (« at 60 », « at 65 », « each at their own
// age ») — worked out off the page's thread. Nothing here touches the network or storage.

export interface RunsRequest {
  profile: Profile
  today: { year: number; month: number }
  selections: readonly Selection[]
}

export type RunsMessage = ReturnType<typeof runSelections>

self.onmessage = (event: MessageEvent<RunsRequest>) => {
  const { profile, today, selections } = event.data
  self.postMessage(runSelections(profile, today, selections) satisfies RunsMessage)
}
