import { PRESET_KEYS, withPreset } from '../engine/assumptionPresets.ts'
import { retireAt } from '../engine/retireAt.ts'
import type { Assumptions, Household } from '../engine/types.ts'

// « And under the other scenarios? » — the earliest age that works with each ready-made set laid over the person's own
// assumptions: three searches of a dozen full projections each, off the page's thread. Nothing here touches the network
// or storage.

export interface PresetEarliestRequest {
  household: Household
  assumptions: Assumptions
}

export type PresetEarliestMessage = { prudent: number | null; neutral: number | null; bold: number | null }

self.onmessage = (event: MessageEvent<PresetEarliestRequest>) => {
  const { household, assumptions } = event.data
  const [prudent, neutral, bold] = PRESET_KEYS.map((p) => retireAt(household, withPreset(assumptions, p), { stopAtFirstOk: true }).earliestOk)
  self.postMessage({ prudent, neutral, bold } satisfies PresetEarliestMessage)
}
