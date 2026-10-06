import { presetVerdicts, sensitivityCells, type PresetVerdict, type SensitivityCell } from '../engine/simulate.ts'
import type { Assumptions, Household } from '../engine/types.ts'

// The « what if the future is a little worse » grid is twenty-seven full projections — several seconds of
// arithmetic. It runs here, off the page's thread, and reports each cell the moment it is known so the table fills
// in while the person watches instead of the whole screen freezing. Nothing here touches the network or storage: it
// receives a household and assumptions, and answers with ages. The three ready-made scenarios go first (they are
// the headline), then the grid.

export interface SensitivityRequest {
  household: Household
  assumptions: Assumptions
}

export type SensitivityMessage = { cell: SensitivityCell } | { preset: PresetVerdict } | { done: true }

self.onmessage = (event: MessageEvent<SensitivityRequest>) => {
  for (const preset of presetVerdicts(event.data.household, event.data.assumptions)) {
    self.postMessage({ preset } satisfies SensitivityMessage)
  }
  for (const cell of sensitivityCells(event.data.household, event.data.assumptions)) {
    self.postMessage({ cell } satisfies SensitivityMessage)
  }
  self.postMessage({ done: true } satisfies SensitivityMessage)
}
