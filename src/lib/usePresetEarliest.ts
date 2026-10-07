import { PRESET_KEYS, withPreset } from '../engine/assumptionPresets.ts'
import { retireAt } from '../engine/retireAt.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { PresetEarliestMessage, PresetEarliestRequest } from './presetEarliest.worker.ts'
import { useOffThread } from './useOffThread.ts'

/** The earliest age that works under each ready-made scenario (null: none up to 70). */
export interface PresetRange {
  prudent: number | null
  neutral: number | null
  bold: number | null
}

/** The range under the three scenarios, or `undefined` while it is being worked out. A result for an OLDER profile is never returned. */
export function usePresetRange(household: Household, assumptions: Assumptions, enabled: boolean): PresetRange | undefined {
  const { value, busy } = useOffThread<PresetEarliestRequest, PresetEarliestMessage, PresetRange>(
    { household, assumptions },
    () => new Worker(new URL('./presetEarliest.worker.ts', import.meta.url), { type: 'module' }),
    () => {
      const [prudent, neutral, bold] = PRESET_KEYS.map((p) => retireAt(household, withPreset(assumptions, p), { stopAtFirstOk: true }).earliestOk)
      return { prudent, neutral, bold }
    },
    (m) => m,
    enabled,
  )
  return busy || value === null ? undefined : value
}
