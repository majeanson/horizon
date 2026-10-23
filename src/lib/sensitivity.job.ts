import { sensitivityCells, type SensitivityCell } from '../engine/simulate.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { JobPort } from './engineJob.ts'

// The « what if the future is a little worse » grid is twenty-seven full projections — several seconds of
// arithmetic. It runs here, off the page's thread, and reports each cell the moment it is known so the table fills
// in while the person watches instead of the whole screen freezing. Nothing here touches the network or storage: it
// receives a household and assumptions, and answers with ages. (The three ready-made scenarios are NOT computed
// here: the verdict's own range line already runs them in lib/presetEarliest.job.ts — one home per figure.)

export interface SensitivityRequest {
  household: Household
  assumptions: Assumptions
}

export type SensitivityMessage = { cell: SensitivityCell } | { done: true }

export function handle(event: { data: SensitivityRequest }, self: JobPort): void {
  for (const cell of sensitivityCells(event.data.household, event.data.assumptions)) {
    self.postMessage({ cell } satisfies SensitivityMessage)
  }
  self.postMessage({ done: true } satisfies SensitivityMessage)
}
