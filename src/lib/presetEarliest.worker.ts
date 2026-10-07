import { withPreset } from '../engine/assumptionPresets.ts'
import { retireAt } from '../engine/retireAt.ts'
import type { Assumptions, Household } from '../engine/types.ts'

// « And under the prudent scenario? » — the earliest age that works with the prudent set laid over the person's own
// assumptions: one search of a dozen full projections, off the page's thread. Nothing here touches the network or storage.

export interface PresetEarliestRequest {
  household: Household
  assumptions: Assumptions
}

export type PresetEarliestMessage = { prudent: number | null }

self.onmessage = (event: MessageEvent<PresetEarliestRequest>) => {
  self.postMessage({ prudent: retireAt(event.data.household, withPreset(event.data.assumptions, 'prudent'), { stopAtFirstOk: true }).earliestOk } satisfies PresetEarliestMessage)
}
